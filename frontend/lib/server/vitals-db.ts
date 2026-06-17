import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { mapDbVitalRow, type DbVitalRow } from "@/lib/server/clinical-mappers";
import type { VitalSignalSample } from "@/types";

function getClient(): SupabaseClient {
  const client = createSupabaseAdminClient();
  if (!client) {
    throw new Error("Supabase is not configured for clinical data.");
  }
  return client;
}

function isMissingTableError(message: string) {
  return message.includes("Could not find the table") || message.includes("PGRST205");
}

function toIsoTimestamp(value: string | null | undefined): string {
  if (!value) return new Date().toISOString();
  return value;
}

function bucketKey(patientId: string, timestamp: string): string {
  return `${patientId}|${timestamp.slice(0, 16)}`;
}

function mergeVitalSamples(samples: VitalSignalSample[]): VitalSignalSample[] {
  const merged = new Map<string, VitalSignalSample>();

  for (const sample of samples) {
    const key = bucketKey(sample.patientId, sample.timestamp);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        patientId: sample.patientId,
        timestamp: sample.timestamp,
        vitals: { ...sample.vitals },
      });
      continue;
    }

    existing.vitals = {
      heartRate: sample.vitals.heartRate ?? existing.vitals.heartRate,
      respiratoryRate: sample.vitals.respiratoryRate ?? existing.vitals.respiratoryRate,
      systolicBp: sample.vitals.systolicBp ?? existing.vitals.systolicBp,
      diastolicBp: sample.vitals.diastolicBp ?? existing.vitals.diastolicBp,
      spo2: sample.vitals.spo2 ?? existing.vitals.spo2,
    };

    if (new Date(sample.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
      existing.timestamp = sample.timestamp;
    }
  }

  return Array.from(merged.values()).sort(
    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );
}

async function readCleanVitals(patientId?: string): Promise<VitalSignalSample[]> {
  const supabase = getClient();
  let query = supabase
    .from("clean_vitals")
    .select(
      "patient_id,timestamp,heart_rate,respiratory_rate,systolic_bp,diastolic_bp,spo2",
    )
    .order("timestamp", { ascending: true });

  if (patientId) query = query.eq("patient_id", patientId);

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error.message)) return [];
    throw new Error(error.message);
  }

  return ((data ?? []) as DbVitalRow[]).map(mapDbVitalRow);
}

async function readWearableContinuous(patientId?: string): Promise<VitalSignalSample[]> {
  const supabase = getClient();
  let query = supabase
    .from("wearable_continuous")
    .select("patient_id,time,heart_rate,respiratory_rate")
    .order("time", { ascending: false });

  if (patientId) {
    query = query.eq("patient_id", patientId).order("time", { ascending: true });
  } else {
    query = query.limit(8000);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => ({
      patientId: row.patient_id,
      timestamp: toIsoTimestamp(row.time),
      vitals: {
        heartRate: row.heart_rate ?? undefined,
        respiratoryRate: row.respiratory_rate ?? undefined,
      },
    }))
    .reverse();
}

async function readWearableMeasurements(patientId?: string): Promise<VitalSignalSample[]> {
  const supabase = getClient();
  let query = supabase
    .from("wearable_measurements")
    .select(
      "patient_id,time,measurement_type,systolic_bp,diastolic_bp,spo2",
    )
    .order("time", { ascending: true });

  if (patientId) query = query.eq("patient_id", patientId);

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const vitals: VitalSignalSample["vitals"] = {};
    if (row.measurement_type === "blood_pressure") {
      vitals.systolicBp = row.systolic_bp ?? undefined;
      vitals.diastolicBp = row.diastolic_bp ?? undefined;
    }
    if (row.measurement_type === "spo2") {
      vitals.spo2 = row.spo2 ?? undefined;
    }
    return {
      patientId: row.patient_id,
      timestamp: toIsoTimestamp(row.time),
      vitals,
    };
  });
}

async function readHealthFeatures(patientId?: string): Promise<VitalSignalSample[]> {
  const supabase = getClient();
  let query = supabase
    .from("health_features")
    .select("patient_id,time,avg_heart_rate,avg_respiratory_rate,min_spo2")
    .order("time", { ascending: true });

  if (patientId) query = query.eq("patient_id", patientId);

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    patientId: row.patient_id,
    timestamp: toIsoTimestamp(row.time),
    vitals: {
      heartRate: row.avg_heart_rate ?? undefined,
      respiratoryRate: row.avg_respiratory_rate ?? undefined,
      spo2: row.min_spo2 ?? undefined,
    },
  }));
}

async function readLatestSensorSnapshots(patientId?: string): Promise<VitalSignalSample[]> {
  const supabase = getClient();
  let query = supabase
    .from("latest_sensor_values")
    .select("patient_id,metric,value_numeric,last_measured_at")
    .in("metric", [
      "heart_rate",
      "respiratory_rate",
      "systolic_bp",
      "diastolic_bp",
      "spo2",
    ]);

  if (patientId) query = query.eq("patient_id", patientId);

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error.message)) return [];
    throw new Error(error.message);
  }

  const grouped = new Map<
    string,
    { timestamp: string; vitals: VitalSignalSample["vitals"] }
  >();

  for (const row of data ?? []) {
    const entry = grouped.get(row.patient_id) ?? {
      timestamp: toIsoTimestamp(row.last_measured_at),
      vitals: {},
    };

    if (
      row.last_measured_at &&
      new Date(row.last_measured_at).getTime() > new Date(entry.timestamp).getTime()
    ) {
      entry.timestamp = toIsoTimestamp(row.last_measured_at);
    }

    switch (row.metric) {
      case "heart_rate":
        entry.vitals.heartRate = row.value_numeric ?? undefined;
        break;
      case "respiratory_rate":
        entry.vitals.respiratoryRate = row.value_numeric ?? undefined;
        break;
      case "systolic_bp":
        entry.vitals.systolicBp = row.value_numeric ?? undefined;
        break;
      case "diastolic_bp":
        entry.vitals.diastolicBp = row.value_numeric ?? undefined;
        break;
      case "spo2":
        entry.vitals.spo2 = row.value_numeric ?? undefined;
        break;
      default:
        break;
    }

    grouped.set(row.patient_id, entry);
  }

  return Array.from(grouped.entries()).map(([id, value]) => ({
    patientId: id,
    timestamp: value.timestamp,
    vitals: value.vitals,
  }));
}

async function readPatientBaselineVitals(patientId?: string): Promise<VitalSignalSample[]> {
  const supabase = getClient();
  let query = supabase
    .from("patients")
    .select("patient_id,baseline_signals,updated_at")
    .not("baseline_signals", "is", null);

  if (patientId) query = query.eq("patient_id", patientId);

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => {
      const signals = row.baseline_signals as Record<string, unknown> | null;
      if (!signals || typeof signals !== "object") return null;

      const vitals: VitalSignalSample["vitals"] = {};
      if (typeof signals.heart_rate === "number") vitals.heartRate = signals.heart_rate;
      if (typeof signals.respiratory_rate === "number") {
        vitals.respiratoryRate = signals.respiratory_rate;
      }
      if (typeof signals.systolic_bp === "number") vitals.systolicBp = signals.systolic_bp;
      if (typeof signals.diastolic_bp === "number") vitals.diastolicBp = signals.diastolic_bp;
      if (typeof signals.spo2 === "number") vitals.spo2 = signals.spo2;

      if (Object.keys(vitals).length === 0) return null;

      return {
        patientId: row.patient_id,
        timestamp: toIsoTimestamp(row.updated_at),
        vitals,
      } satisfies VitalSignalSample;
    })
    .filter((item): item is VitalSignalSample => item !== null);
}

async function loadMergedVitals(patientId?: string): Promise<VitalSignalSample[]> {
  const [
    clean,
    continuous,
    measurements,
    features,
    latestSnapshots,
    baselines,
  ] = await Promise.all([
    readCleanVitals(patientId),
    readWearableContinuous(patientId),
    readWearableMeasurements(patientId),
    readHealthFeatures(patientId),
    readLatestSensorSnapshots(patientId),
    readPatientBaselineVitals(patientId),
  ]);

  if (clean.length > 0) {
    return mergeVitalSamples([
      ...clean,
      ...measurements,
      ...latestSnapshots,
    ]);
  }

  const streamMerged = mergeVitalSamples([
    ...continuous,
    ...measurements,
    ...features,
  ]);

  if (streamMerged.length > 0) {
    return mergeVitalSamples([...streamMerged, ...latestSnapshots]);
  }

  const snapshotMerged = mergeVitalSamples([...latestSnapshots, ...baselines]);
  return snapshotMerged;
}

export async function getLatestVitalsForList(): Promise<VitalSignalSample[]> {
  const [latestSnapshots, baselines] = await Promise.all([
    readLatestSensorSnapshots(),
    readPatientBaselineVitals(),
  ]);
  return mergeVitalSamples([...latestSnapshots, ...baselines]);
}

export async function getAllVitals(): Promise<VitalSignalSample[]> {
  return loadMergedVitals();
}

export async function getVitalsForPatient(
  patientId: string,
  options?: { since?: Date },
): Promise<VitalSignalSample[]> {
  const samples = await loadMergedVitals(patientId);
  if (!options?.since) return samples;

  const sinceMs = options.since.getTime();
  return samples.filter((sample) => new Date(sample.timestamp).getTime() >= sinceMs);
}

export function parseVitalsRange(range: string): Date | undefined {
  const match = /^(\d+)(m|h|d)$/.exec(range.trim());
  if (!match) return undefined;

  const amount = Number(match[1]);
  const unit = match[2];
  const since = new Date();

  if (unit === "m") since.setMinutes(since.getMinutes() - amount);
  if (unit === "h") since.setHours(since.getHours() - amount);
  if (unit === "d") since.setDate(since.getDate() - amount);

  return since;
}
