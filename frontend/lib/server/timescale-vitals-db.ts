import "server-only";

import {
  isTimescaleConfigured,
  timescaleQuery,
} from "@/lib/server/timescale-pg";
import type { VitalSignalSample } from "@/types";

const CHART_BUCKET = "5 minutes";

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

async function readContinuousBuckets(
  patientId: string,
  since: Date,
): Promise<VitalSignalSample[]> {
  const rows = await timescaleQuery<ContinuousBucketRow>(
    `
      SELECT
        time_bucket($1::interval, time) AS bucket,
        AVG(heart_rate)::float AS heart_rate,
        AVG(respiratory_rate)::float AS respiratory_rate
      FROM wearable_continuous
      WHERE patient_id = $2
        AND time >= $3
      GROUP BY bucket
      ORDER BY bucket ASC
    `,
    [CHART_BUCKET, patientId, since.toISOString()],
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
): Promise<VitalSignalSample[]> {
  const [spo2Rows, bpRows] = await Promise.all([
    timescaleQuery<Spo2BucketRow>(
      `
        SELECT
          time_bucket($1::interval, time) AS bucket,
          AVG(spo2)::float AS spo2
        FROM wearable_measurements
        WHERE patient_id = $2
          AND time >= $3
          AND measurement_type = 'spo2'
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
      [CHART_BUCKET, patientId, since.toISOString()],
    ),
    timescaleQuery<BpBucketRow>(
      `
        SELECT
          time_bucket($1::interval, time) AS bucket,
          AVG(systolic_bp)::float AS systolic_bp,
          AVG(diastolic_bp)::float AS diastolic_bp
        FROM wearable_measurements
        WHERE patient_id = $2
          AND time >= $3
          AND measurement_type = 'blood_pressure'
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
      [CHART_BUCKET, patientId, since.toISOString()],
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

export async function getTimescalePatientVitals(
  patientId: string,
  since?: Date,
): Promise<VitalSignalSample[]> {
  if (!isTimescaleConfigured()) return [];

  const sinceDate =
    since ??
    (() => {
      const fallback = new Date();
      fallback.setHours(fallback.getHours() - 24);
      return fallback;
    })();

  try {
    const [continuous, measurements] = await Promise.all([
      readContinuousBuckets(patientId, sinceDate),
      readMeasurementBuckets(patientId, sinceDate),
    ]);
    return mergeVitalSamples([...continuous, ...measurements]);
  } catch {
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
          WHERE measurement_type = 'spo2'
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
          WHERE measurement_type = 'blood_pressure'
          ORDER BY patient_id, time DESC
        `,
      ),
    ]);

    return mergeLatestByPatient(continuous, spo2Rows, bpRows);
  } catch {
    return [];
  }
}
