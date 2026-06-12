import { mockAlerts, mockPatients, mockVitals } from "@/lib/mock";
import { normalizePatientId } from "@/lib/patient-id";
import type { Alert, Evidence, MetricSummary, Patient, VitalSignalSample } from "@/types";

type LocalizedTextDto = {
  vi: string;
  en: string;
};

export type MockPatientDto = {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: Patient["gender"];
  status: Patient["status"];
  ward_code: string;
  ward_label?: LocalizedTextDto;
  department_code?: string;
  department_label?: LocalizedTextDto;
  bed?: string | null;
  underlying_condition_codes: string[];
  medication_cycle: Array<{
    medication: LocalizedTextDto;
    dosage: string;
    schedule: LocalizedTextDto;
    last_taken_at: string | null;
    next_dose_at: string | null;
  }>;
  recent_symptom_codes: string[];
  last_updated: string;
};

export type MockVitalDto = {
  patient_id: string;
  timestamp: string;
  heart_rate: number;
  respiratory_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  spo2: number;
};

export type MockPatientListItemDto = {
  patient: MockPatientDto;
  latest_vital: MockVitalDto | null;
  open_alert_count: number;
};

export type MockPatientVitalsDto = {
  patient_id: string;
  range: string;
  samples: MockVitalDto[];
  metric_summaries: Array<{
    metric: MetricSummary["metric"];
    current_value: number;
    unit: MetricSummary["unit"];
    average_15m: number;
    trend: MetricSummary["trend"];
    change_pct: number;
    status: MetricSummary["status"];
  }>;
};

export type MockAlertDto = {
  id: string;
  patient_id: string;
  type: Alert["type"];
  severity: Alert["severity"];
  score?: number | null;
  evidence: Array<Record<string, unknown>>;
  timestamp: string;
  acknowledged: boolean;
  message: string;
};

function mapPatientDto(patient: Patient): MockPatientDto {
  return {
    id: patient.id,
    mrn: patient.mrn,
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    status: patient.status,
    ward_code: patient.wardCode,
    ward_label: patient.wardLabel,
    department_code: patient.departmentCode,
    department_label: patient.departmentLabel,
    bed: patient.bed ?? null,
    underlying_condition_codes: patient.underlyingConditionCodes,
    medication_cycle: patient.medicationCycle.map((item) => ({
      medication: item.medication,
      dosage: item.dosage,
      schedule: item.schedule,
      last_taken_at: item.lastTakenAt,
      next_dose_at: item.nextDoseAt,
    })),
    recent_symptom_codes: patient.recentSymptomCodes,
    last_updated: patient.lastUpdated,
  };
}

function mapVitalDto(vital: VitalSignalSample): MockVitalDto {
  return {
    patient_id: vital.patientId,
    timestamp: vital.timestamp,
    heart_rate: vital.vitals.heartRate ?? 0,
    respiratory_rate: vital.vitals.respiratoryRate ?? 0,
    systolic_bp: vital.vitals.systolicBp ?? 0,
    diastolic_bp: vital.vitals.diastolicBp ?? 0,
    spo2: vital.vitals.spo2 ?? 0,
  };
}

function getLatestVital(patientId: string): MockVitalDto | null {
  const latest = mockVitals
    .filter((item) => normalizePatientId(item.patientId) === patientId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  return latest ? mapVitalDto(latest) : null;
}

function getPatientVitals(patientId: string): VitalSignalSample[] {
  return mockVitals
    .filter((item) => normalizePatientId(item.patientId) === patientId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

function determineMetricStatus(metric: MetricSummary["metric"], value: number): MetricSummary["status"] {
  if (metric === "spo2") {
    if (value < 90) return "critical";
    if (value < 95) return "at_risk";
    return "healthy";
  }
  if (metric === "heart_rate") {
    if (value > 120 || value < 50) return "critical";
    if (value > 100 || value < 60) return "at_risk";
    return "healthy";
  }
  if (metric === "respiratory_rate") {
    if (value > 30 || value < 8) return "critical";
    if (value > 20 || value < 10) return "at_risk";
    return "healthy";
  }
  if (metric === "systolic_bp") {
    if (value > 160 || value < 80) return "critical";
    if (value > 140 || value < 90) return "at_risk";
    return "healthy";
  }
  if (metric === "diastolic_bp") {
    if (value > 100 || value < 50) return "critical";
    if (value > 90 || value < 60) return "at_risk";
    return "healthy";
  }
  return "healthy";
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function changePct(current: number, baseline: number): number {
  if (baseline === 0) return 0;
  return Math.round(((current - baseline) / baseline) * 100);
}

function buildMetricSummary(
  metric: MetricSummary["metric"],
  unit: MetricSummary["unit"],
  values: number[],
): MockPatientVitalsDto["metric_summaries"][number] {
  const current = values[values.length - 1] ?? 0;
  const previous = values[values.length - 2] ?? current;
  const delta = changePct(current, previous);

  return {
    metric,
    current_value: current,
    unit,
    average_15m: average(values),
    trend: delta === 0 ? "stable" : delta > 0 ? "up" : "down",
    change_pct: delta,
    status: determineMetricStatus(metric, current),
  };
}

function mapEvidenceDto(evidence: Evidence): Record<string, unknown> {
  return {
    kind: evidence.kind,
    metric: evidence.metric,
    symptom_code: evidence.symptomCode,
    value: evidence.value,
    unit: evidence.unit,
    timestamp: evidence.timestamp,
    comparison_value: evidence.comparisonValue,
    comparison_window: evidence.comparisonWindow,
    note_key: evidence.noteKey,
  };
}

function mapAlertDto(alert: Alert): MockAlertDto {
  return {
    id: alert.id,
    patient_id: normalizePatientId(alert.patientId),
    type: alert.type,
    severity: alert.severity,
    score: alert.score ?? null,
    evidence: alert.evidence.map(mapEvidenceDto),
    timestamp: alert.timestamp,
    acknowledged: alert.acknowledged,
    message: "",
  };
}

export function listMockAlerts(): MockAlertDto[] {
  return [...mockAlerts]
    .map(mapAlertDto)
    .sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
    );
}

export function listMockPatientItems(params?: {
  query?: string | null;
  status?: string | null;
}): MockPatientListItemDto[] {
  const query = params?.query?.trim().toLowerCase() ?? "";
  const status = params?.status?.trim().toLowerCase() ?? "";

  return mockPatients
    .filter((patient) => {
      if (query) {
        const values = [patient.id, patient.mrn, patient.name].map((value) => value.toLowerCase());
        if (!values.some((value) => value.includes(query))) {
          return false;
        }
      }

      if (status && status !== "all" && patient.status !== status) {
        return false;
      }

      return true;
    })
    .map((patient) => {
      const normalizedPatientId = normalizePatientId(patient.id);
      return {
        patient: mapPatientDto(patient),
        latest_vital: getLatestVital(normalizedPatientId),
        open_alert_count: mockAlerts.filter(
          (alert) => normalizePatientId(alert.patientId) === normalizedPatientId && !alert.acknowledged,
        ).length,
      };
    });
}

export function getMockPatientById(patientId: string): MockPatientDto | null {
  const normalizedPatientId = normalizePatientId(patientId);
  const patient = mockPatients.find(
    (item) => normalizePatientId(item.id) === normalizedPatientId,
  );
  return patient ? mapPatientDto(patient) : null;
}

export function getMockPatientVitalsById(
  patientId: string,
  range = "15m",
): MockPatientVitalsDto | null {
  const normalizedPatientId = normalizePatientId(patientId);
  const samples = getPatientVitals(normalizedPatientId);
  if (samples.length === 0) {
    return null;
  }

  const heartRates = samples.map((item) => item.vitals.heartRate ?? 0);
  const respiratoryRates = samples.map(
    (item) => item.vitals.respiratoryRate ?? 0,
  );
  const systolicBp = samples.map((item) => item.vitals.systolicBp ?? 0);
  const diastolicBp = samples.map((item) => item.vitals.diastolicBp ?? 0);
  const spo2 = samples.map((item) => item.vitals.spo2 ?? 0);

  return {
    patient_id: normalizedPatientId,
    range,
    samples: samples.map(mapVitalDto),
    metric_summaries: [
      buildMetricSummary("heart_rate", "bpm", heartRates),
      buildMetricSummary("respiratory_rate", "rpm", respiratoryRates),
      buildMetricSummary("spo2", "%", spo2),
      buildMetricSummary("systolic_bp", "mmHg", systolicBp),
      buildMetricSummary("diastolic_bp", "mmHg", diastolicBp),
    ],
  };
}

export function listMockPatientAlerts(patientId: string): MockAlertDto[] {
  const normalizedPatientId = normalizePatientId(patientId);
  return listMockAlerts().filter(
    (alert) => alert.patient_id === normalizedPatientId,
  );
}
