import {
  getAlertById,
  getAlerts,
  getPatientById,
  getPatients,
} from "@/lib/server/clinical-db";
import { getLatestVitalsForList } from "@/lib/server/vitals-db";
import { normalizePatientId } from "@/lib/patient-id";
import type {
  Alert,
  Evidence,
  MetricSummary,
  Patient,
  PatientDbProfile,
  VitalSignalSample,
} from "@/types";

type LocalizedTextDto = {
  vi: string;
  en: string;
};

export type PatientDto = {
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
  db_profile?: PatientDbProfileDto | null;
};

type PatientDbProfileDto = {
  mimic_subject_id?: number | null;
  age_group?: string | null;
  pregnancy_status?: string | null;
  lifestyle?: string | null;
  activity_level?: string | null;
  medical_history?: string | null;
  health_status?: string | null;
  record_status?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  risk_factors: string[];
  baseline_signals?: PatientDbProfile["baselineSignals"];
  created_at?: string | null;
};

export type VitalDto = {
  patient_id: string;
  timestamp: string;
  heart_rate: number;
  respiratory_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  spo2: number;
};

export type PatientListItemDto = {
  patient: PatientDto;
  latest_vital: VitalDto | null;
  open_alert_count: number;
};

export type PatientVitalsDto = {
  patient_id: string;
  range: string;
  samples: VitalDto[];
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

export type AlertDto = {
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

function mapDbProfileDto(profile?: PatientDbProfile): PatientDbProfileDto | null {
  if (!profile) return null;
  return {
    mimic_subject_id: profile.mimicSubjectId ?? null,
    age_group: profile.ageGroup ?? null,
    pregnancy_status: profile.pregnancyStatus ?? null,
    lifestyle: profile.lifestyle ?? null,
    activity_level: profile.activityLevel ?? null,
    medical_history: profile.medicalHistory ?? null,
    health_status: profile.healthStatus ?? null,
    record_status: profile.recordStatus ?? null,
    weight_kg: profile.weightKg ?? null,
    height_cm: profile.heightCm ?? null,
    risk_factors: profile.riskFactors,
    baseline_signals: profile.baselineSignals,
    created_at: profile.createdAt ?? null,
  };
}

function mapPatientDto(patient: Patient): PatientDto {
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
    db_profile: mapDbProfileDto(patient.dbProfile),
  };
}

function mapVitalDto(vital: VitalSignalSample): VitalDto {
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

function getLatestVitalFromSamples(
  samples: VitalSignalSample[],
  patientId: string,
): VitalDto | null {
  const latest = samples
    .filter((item) => normalizePatientId(item.patientId) === patientId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  return latest ? mapVitalDto(latest) : null;
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
): PatientVitalsDto["metric_summaries"][number] {
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

function mapAlertDto(alert: Alert): AlertDto {
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

export async function enrichAlertDto<T extends { id: string; patient_id: string }>(
  dto: T,
): Promise<
  T & {
    workflow_status: Alert["workflowStatus"];
    assigned_floor_nurse_id: string | null;
    assigned_zone_code: string | null;
    noise_note: string | null;
    treatment: Alert["treatment"] | null;
  }
> {
  const alert = await getAlertById(dto.id);
  return {
    ...dto,
    workflow_status: alert?.workflowStatus ?? "open",
    assigned_floor_nurse_id: alert?.assignedFloorNurseId ?? null,
    assigned_zone_code: alert?.assignedZoneCode ?? null,
    noise_note: alert?.noiseNote ?? null,
    treatment: alert?.treatment ?? null,
  };
}

export async function listPatientItems(params?: {
  query?: string | null;
  status?: string | null;
}): Promise<PatientListItemDto[]> {
  const query = params?.query?.trim().toLowerCase() ?? "";
  const status = params?.status?.trim().toLowerCase() ?? "";
  const [patients, alerts, vitals] = await Promise.all([
    getPatients(),
    getAlerts(),
    getLatestVitalsForList(),
  ]);

  return patients
    .filter((patient) => {
      if (query) {
        const values = [patient.id, patient.mrn, patient.name].map((value) => value.toLowerCase());
        if (!values.some((value) => value.includes(query))) return false;
      }
      if (status && status !== "all" && patient.status !== status) return false;
      return true;
    })
    .map((patient) => {
      const normalizedPatientId = normalizePatientId(patient.id);
      return {
        patient: mapPatientDto(patient),
        latest_vital: getLatestVitalFromSamples(vitals, normalizedPatientId),
        open_alert_count: alerts.filter((alert) => {
          if (normalizePatientId(alert.patientId) !== normalizedPatientId) return false;
          return alert.workflowStatus !== "doctor_confirmed";
        }).length,
      };
    });
}

export async function getPatientDtoById(patientId: string): Promise<PatientDto | null> {
  const normalizedPatientId = normalizePatientId(patientId);
  const patient = await getPatientById(normalizedPatientId);
  return patient ? mapPatientDto(patient) : null;
}

export async function getPatientVitalsDto(
  patientId: string,
  range = "15m",
): Promise<PatientVitalsDto | null> {
  const normalizedPatientId = normalizePatientId(patientId);
  const { getVitalsByPatient } = await import("@/lib/server/clinical-db");
  const samples = (
    await getVitalsByPatient(normalizedPatientId, range)
  ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (samples.length === 0) return null;

  const heartRates = samples.map((item) => item.vitals.heartRate ?? 0);
  const respiratoryRates = samples.map((item) => item.vitals.respiratoryRate ?? 0);
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

export async function listAlerts(): Promise<AlertDto[]> {
  return [...(await getAlerts())]
    .map(mapAlertDto)
    .sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
    );
}

export async function listPatientAlerts(patientId: string): Promise<AlertDto[]> {
  const normalizedPatientId = normalizePatientId(patientId);
  const alerts = await listAlerts();
  return alerts.filter((alert) => alert.patient_id === normalizedPatientId);
}
