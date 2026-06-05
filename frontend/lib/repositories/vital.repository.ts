import type { MetricSummary, PatientStatus, VitalMetric, VitalSignalSample } from "@/types";
import { mockVitals } from "@/lib/mock";
import { normalizePatientId } from "@/lib/patient-id";

function roundChange(current: number, previous: number) {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

function metricStatus(metric: VitalMetric, value: number): PatientStatus {
  switch (metric) {
    case "spo2":
      if (value <= 92) return "critical";
      if (value <= 95) return "recent_symptom";
      return "healthy";
    case "heart_rate":
      if (value >= 110 || value <= 50) return "critical";
      if (value >= 95 || value <= 58) return "at_risk";
      return "healthy";
    case "systolic_bp":
      if (value >= 150 || value <= 90) return "critical";
      if (value >= 130 || value <= 100) return "at_risk";
      return "healthy";
    case "diastolic_bp":
      if (value >= 95 || value <= 55) return "critical";
      if (value >= 85 || value <= 60) return "at_risk";
      return "healthy";
    case "hrv_rmssd":
      if (value <= 18) return "critical";
      if (value <= 28) return "at_risk";
      return "healthy";
  }
}

function buildSummary(
  metric: VitalMetric,
  current: number,
  previous: number,
  average: number,
  unit: MetricSummary["unit"],
): MetricSummary {
  const changePct = roundChange(current, previous);

  return {
    metric,
    currentValue: current,
    unit,
    average15Min: average,
    trend: changePct === 0 ? "stable" : changePct > 0 ? "up" : "down",
    changePct,
    status: metricStatus(metric, current),
  };
}

function average(values: number[]) {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function deriveMetricSummaries(samples: VitalSignalSample[]): MetricSummary[] {
  if (samples.length === 0) return [];
  const ordered = [...samples].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const latest = ordered.at(-1)?.vitals;
  const previous = ordered.at(-2)?.vitals ?? latest;

  if (!latest || !previous) return [];

  const heartRates = ordered.map((sample) => sample.vitals.heartRate ?? 0);
  const hrvValues = ordered.map((sample) => sample.vitals.hrvRmssd ?? 0);
  const spo2Values = ordered.map((sample) => sample.vitals.spo2 ?? 0);
  const systolicValues = ordered.map((sample) => sample.vitals.systolicBp ?? 0);
  const diastolicValues = ordered.map((sample) => sample.vitals.diastolicBp ?? 0);

  return [
    buildSummary(
      "heart_rate",
      latest.heartRate ?? 0,
      previous.heartRate ?? latest.heartRate ?? 0,
      average(heartRates),
      "bpm",
    ),
    buildSummary(
      "hrv_rmssd",
      latest.hrvRmssd ?? 0,
      previous.hrvRmssd ?? latest.hrvRmssd ?? 0,
      average(hrvValues),
      "ms",
    ),
    buildSummary(
      "spo2",
      latest.spo2 ?? 0,
      previous.spo2 ?? latest.spo2 ?? 0,
      average(spo2Values),
      "%",
    ),
    buildSummary(
      "systolic_bp",
      latest.systolicBp ?? 0,
      previous.systolicBp ?? latest.systolicBp ?? 0,
      average(systolicValues),
      "mmHg",
    ),
    buildSummary(
      "diastolic_bp",
      latest.diastolicBp ?? 0,
      previous.diastolicBp ?? latest.diastolicBp ?? 0,
      average(diastolicValues),
      "mmHg",
    ),
  ];
}

export const vitalRepository = {
  listByPatient(patientId: string) {
    const normalizedPatientId = normalizePatientId(patientId);
    return mockVitals.filter(
      (vital) => normalizePatientId(vital.patientId) === normalizedPatientId,
    );
  },

  listMetricSummaries(patientId: string) {
    const normalizedPatientId = normalizePatientId(patientId);
    return deriveMetricSummaries(
      mockVitals.filter(
        (vital) => normalizePatientId(vital.patientId) === normalizedPatientId,
      ),
    );
  },
};
