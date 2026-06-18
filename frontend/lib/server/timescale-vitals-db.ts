import "server-only";

import {
  isTimescaleConfigured,
  timescaleQuery,
} from "@/lib/server/timescale-pg";
import type { VitalSignalSample } from "@/types";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

type ContinuousBucketRow = {
  bucket: Date;
  heart_rate: number | null;
  respiratory_rate: number | null;
};

type Spo2BucketRow = {
  bucket: Date;
  spo2: number | null;
};

type BpBucketRow = {
  bucket: Date;
  systolic_bp: number | null;
  diastolic_bp: number | null;
};

type LatestContinuousRow = {
  patient_id: string;
  time: Date;
  heart_rate: number | null;
  respiratory_rate: number | null;
};

type LatestSpo2Row = {
  patient_id: string;
  time: Date;
  spo2: number | null;
};

type LatestBpRow = {
  patient_id: string;
  time: Date;
  systolic_bp: number | null;
  diastolic_bp: number | null;
};

type LatestPatientTimeRow = {
  latest_time: Date | null;
};

type PatientWindow = {
  bucketInterval: string;
  sinceDate: Date;
};

function toIso(value: Date | string): string {
  return new Date(value).toISOString();
}

function bucketKey(patientId: string, timestamp: string): string {
  return `${patientId}|${timestamp}`;
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
  }

  return Array.from(merged.values()).sort(
    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );
}

function mergeLatestByPatient(
  continuous: LatestContinuousRow[],
  spo2Rows: LatestSpo2Row[],
  bpRows: LatestBpRow[],
): VitalSignalSample[] {
  const byPatient = new Map<string, VitalSignalSample>();

  for (const row of continuous) {
    const current = byPatient.get(row.patient_id) ?? {
      patientId: row.patient_id,
      timestamp: toIso(row.time),
      vitals: {},
    };
    current.vitals.heartRate = row.heart_rate ?? undefined;
    current.vitals.respiratoryRate = row.respiratory_rate ?? undefined;
    if (new Date(row.time).getTime() > new Date(current.timestamp).getTime()) {
      current.timestamp = toIso(row.time);
    }
    byPatient.set(row.patient_id, current);
  }

  for (const row of spo2Rows) {
    const current = byPatient.get(row.patient_id) ?? {
      patientId: row.patient_id,
      timestamp: toIso(row.time),
      vitals: {},
    };
    current.vitals.spo2 = row.spo2 ?? undefined;
    if (new Date(row.time).getTime() > new Date(current.timestamp).getTime()) {
      current.timestamp = toIso(row.time);
    }
    byPatient.set(row.patient_id, current);
  }

  for (const row of bpRows) {
    const current = byPatient.get(row.patient_id) ?? {
      patientId: row.patient_id,
      timestamp: toIso(row.time),
      vitals: {},
    };
    current.vitals.systolicBp = row.systolic_bp ?? undefined;
    current.vitals.diastolicBp = row.diastolic_bp ?? undefined;
    if (new Date(row.time).getTime() > new Date(current.timestamp).getTime()) {
      current.timestamp = toIso(row.time);
    }
    byPatient.set(row.patient_id, current);
  }

  return Array.from(byPatient.values()).filter(
    (sample) => Object.keys(sample.vitals).length > 0,
  );
}

function logTimescaleRead(label: string, samples: VitalSignalSample[]): void {
  console.info(`[Timescale] ${label}: read ${samples.length} vital sample(s)`, {
    preview: samples.slice(0, 3),
  });
}

function logTimescaleReadError(label: string, error: unknown): void {
  console.warn(
    `[Timescale] ${label}: unable to read vitals`,
    error instanceof Error ? error.message : error,
  );
}

async function readContinuousBuckets(
  patientId: string,
  since: Date,
  bucketInterval: string,
): Promise<VitalSignalSample[]> {
  const rows = await timescaleQuery<ContinuousBucketRow>(
    `
      SELECT DISTINCT ON (bucket)
        bucket,
        heart_rate::float AS heart_rate,
        respiratory_rate::float AS respiratory_rate
      FROM (
        SELECT
          time_bucket($1::interval, time) AS bucket,
          time,
          heart_rate,
          respiratory_rate
        FROM wearable_continuous
        WHERE patient_id = $2
          AND time >= $3
          AND (heart_rate IS NOT NULL OR respiratory_rate IS NOT NULL)
      ) samples
      ORDER BY bucket ASC, time DESC
    `,
    [bucketInterval, patientId, since.toISOString()],
  );

  return rows.map((row) => ({
    patientId,
    timestamp: toIso(row.bucket),
    vitals: {
      heartRate: row.heart_rate ?? undefined,
      respiratoryRate: row.respiratory_rate ?? undefined,
    },
  }));
}

async function readMeasurementBuckets(
  patientId: string,
  since: Date,
  bucketInterval: string,
): Promise<VitalSignalSample[]> {
  const [spo2Rows, bpRows] = await Promise.all([
    timescaleQuery<Spo2BucketRow>(
      `
        SELECT DISTINCT ON (bucket)
          bucket,
          spo2::float AS spo2
        FROM (
          SELECT
            time_bucket($1::interval, time) AS bucket,
            time,
            spo2
          FROM wearable_measurements
          WHERE patient_id = $2
            AND time >= $3
            AND lower(measurement_type) = 'spo2'
            AND spo2 IS NOT NULL
        ) samples
        ORDER BY bucket ASC, time DESC
      `,
      [bucketInterval, patientId, since.toISOString()],
    ),
    timescaleQuery<BpBucketRow>(
      `
        SELECT DISTINCT ON (bucket)
          bucket,
          systolic_bp::float AS systolic_bp,
          diastolic_bp::float AS diastolic_bp
        FROM (
          SELECT
            time_bucket($1::interval, time) AS bucket,
            time,
            systolic_bp,
            diastolic_bp
          FROM wearable_measurements
          WHERE patient_id = $2
            AND time >= $3
            AND lower(measurement_type) = 'blood_pressure'
            AND (systolic_bp IS NOT NULL OR diastolic_bp IS NOT NULL)
        ) samples
        ORDER BY bucket ASC, time DESC
      `,
      [bucketInterval, patientId, since.toISOString()],
    ),
  ]);

  const spo2Samples = spo2Rows.map((row) => ({
    patientId,
    timestamp: toIso(row.bucket),
    vitals: { spo2: row.spo2 ?? undefined },
  }));

  const bpSamples = bpRows.map((row) => ({
    patientId,
    timestamp: toIso(row.bucket),
    vitals: {
      systolicBp: row.systolic_bp ?? undefined,
      diastolicBp: row.diastolic_bp ?? undefined,
    },
  }));

  return [...spo2Samples, ...bpSamples];
}

async function readLatestPatientTime(patientId: string): Promise<Date | null> {
  const rows = await timescaleQuery<LatestPatientTimeRow>(
    `
      SELECT max(time) AS latest_time
      FROM (
        SELECT time FROM wearable_continuous WHERE patient_id = $1
        UNION ALL
        SELECT time FROM wearable_measurements WHERE patient_id = $1
      ) patient_samples
    `,
    [patientId],
  );

  return rows[0]?.latest_time ?? null;
}

function chartBucketForWindow(windowMs: number): string {
  if (windowMs <= 15 * MINUTE_MS) return "10 seconds";
  if (windowMs <= HOUR_MS) return "30 seconds";
  if (windowMs <= 3 * HOUR_MS) return "1 minute";
  if (windowMs <= 9 * HOUR_MS) return "3 minutes";
  if (windowMs <= DAY_MS) return "10 minutes";
  return "1 hour";
}

async function resolvePatientWindow(patientId: string, since?: Date): Promise<PatientWindow> {
  const requestedWindowMs = since
    ? Math.max(Date.now() - since.getTime(), 60_000)
    : DAY_MS;
  const latestTime = await readLatestPatientTime(patientId);
  const bucketInterval = chartBucketForWindow(requestedWindowMs);

  if (!latestTime) {
    return {
      bucketInterval,
      sinceDate: since ?? new Date(Date.now() - requestedWindowMs),
    };
  }

  return {
    bucketInterval,
    sinceDate: new Date(latestTime.getTime() - requestedWindowMs),
  };
}

export async function getTimescalePatientVitals(
  patientId: string,
  since?: Date,
): Promise<VitalSignalSample[]> {
  if (!isTimescaleConfigured()) return [];

  try {
    const { bucketInterval, sinceDate } = await resolvePatientWindow(patientId, since);
    const [continuous, measurements] = await Promise.all([
      readContinuousBuckets(patientId, sinceDate, bucketInterval),
      readMeasurementBuckets(patientId, sinceDate, bucketInterval),
    ]);
    const samples = mergeVitalSamples([...continuous, ...measurements]);
    logTimescaleRead(`patient ${patientId}`, samples);
    return samples;
  } catch (error) {
    logTimescaleReadError(`patient ${patientId}`, error);
    return [];
  }
}

export async function getTimescaleLatestVitalsForList(): Promise<VitalSignalSample[]> {
  if (!isTimescaleConfigured()) return [];

  try {
    const [continuous, spo2Rows, bpRows] = await Promise.all([
      timescaleQuery<LatestContinuousRow>(
        `
          SELECT DISTINCT ON (patient_id)
            patient_id,
            time,
            heart_rate,
            respiratory_rate
          FROM wearable_continuous
          WHERE heart_rate IS NOT NULL OR respiratory_rate IS NOT NULL
          ORDER BY patient_id, time DESC
        `,
      ),
      timescaleQuery<LatestSpo2Row>(
        `
          SELECT DISTINCT ON (patient_id)
            patient_id,
            time,
            spo2
          FROM wearable_measurements
          WHERE lower(measurement_type) = 'spo2'
            AND spo2 IS NOT NULL
          ORDER BY patient_id, time DESC
        `,
      ),
      timescaleQuery<LatestBpRow>(
        `
          SELECT DISTINCT ON (patient_id)
            patient_id,
            time,
            systolic_bp,
            diastolic_bp
          FROM wearable_measurements
          WHERE lower(measurement_type) = 'blood_pressure'
            AND (systolic_bp IS NOT NULL OR diastolic_bp IS NOT NULL)
          ORDER BY patient_id, time DESC
        `,
      ),
    ]);

    const samples = mergeLatestByPatient(continuous, spo2Rows, bpRows);
    logTimescaleRead("latest list", samples);
    return samples;
  } catch (error) {
    logTimescaleReadError("latest list", error);
    return [];
  }
}
