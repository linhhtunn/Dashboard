import {
  buildLocalizedPair,
  getDepartmentLabel,
  getMedicationLabel,
  getScheduleLabel,
  getWardLabelByCode,
} from "@/lib/i18n/domain";
import type {
  Alert,
  AlertActionLogEntry,
  AlertSeverity,
  AlertTreatmentRecord,
  AlertType,
  AlertWorkflowStatus,
  Evidence,
  Gender,
  MedicationCycle,
  OperatorRole,
  Patient,
  PatientStatus,
  Shift,
  ShiftBand,
  ShiftScheduleSlot,
  ShiftStaffMember,
  ShiftStaffRole,
  ShiftStaffStatus,
  VitalSignalSample,
} from "@/types";
import type {
  AlertSeed,
  PatientSeed,
  StaffSeed,
  VitalSeed,
} from "@/lib/server/seed/types";

function text(vi: string, en: string) {
  return { vi, en };
}

export type DbPatientRow = {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: string;
  status: string;
  ward_code: string;
  department_code: string;
  bed?: string | null;
  underlying_condition_codes: string[] | unknown;
  recent_symptom_codes: string[] | unknown;
  medications: PatientSeed["medications"] | unknown;
  last_updated: string;
};

export type DbBackendPatientRow = {
  patient_id: string;
  name: string;
  age: number;
  gender: string;
  status?: string | null;
  health_status?: string | null;
  medical_history?: string | null;
  risk_factors?: string[] | unknown;
  updated_at?: string | null;
};

export type DbAlertRow = {
  id: string;
  patient_id: string;
  type: string;
  severity: string;
  score?: number | null;
  evidence: Evidence[] | Record<string, unknown>[] | unknown;
  timestamp: string;
  acknowledged: boolean;
  workflow_status?: string | null;
  assigned_floor_nurse_id?: string | null;
  assigned_zone_code?: string | null;
  noise_note?: string | null;
  treatment?: AlertTreatmentRecord | null;
};

export type DbBackendAlertRow = {
  alert_id: string;
  patient_id: string;
  alert_type?: string | null;
  severity?: string | null;
  alert_time?: string | null;
  features?: Record<string, unknown> | Record<string, unknown>[] | unknown;
  confidence?: number | null;
  status?: string | null;
  reason?: string | null;
};

export type DbVitalRow = {
  patient_id: string;
  timestamp: string;
  heart_rate?: number | null;
  respiratory_rate?: number | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  spo2?: number | null;
};

function mapEvidence(input: Record<string, unknown>): Evidence {
  return {
    kind: (input.kind as Evidence["kind"]) ?? "patient_context",
    metric: input.metric as Evidence["metric"] | undefined,
    symptomCode: (input.symptom_code as string) ?? undefined,
    value: typeof input.value === "number" ? input.value : undefined,
    unit: input.unit as Evidence["unit"] | undefined,
    timestamp: typeof input.timestamp === "string" ? input.timestamp : undefined,
    comparisonValue:
      typeof input.comparison_value === "number" ? input.comparison_value : undefined,
    comparisonWindow:
      typeof input.comparison_window === "string"
        ? (input.comparison_window as Evidence["comparisonWindow"])
        : undefined,
    noteKey: typeof input.note_key === "string" ? input.note_key : undefined,
  };
}

function mapDbStatus(status: string | null | undefined): PatientStatus {
  const value = (status ?? "healthy").toLowerCase();
  if (value === "normal" || value === "healthy") return "healthy";
  if (value === "warning" || value === "at_risk" || value === "abnormal") return "at_risk";
  if (value === "critical") return "critical";
  if (value === "recent_symptom") return "recent_symptom";
  return "healthy";
}

function mapDbSeverity(severity: string | null | undefined): AlertSeverity {
  const value = (severity ?? "warning").toUpperCase();
  if (value === "HIGH" || value === "CRITICAL") return "critical";
  if (value === "LOW" || value === "INFO") return "info";
  if (value === "WARNING" || value === "MEDIUM") return "warning";
  const lower = severity?.toLowerCase();
  if (lower === "critical" || lower === "high") return "critical";
  if (lower === "info" || lower === "low") return "info";
  if (lower === "medium") return "warning";
  return "warning";
}

function mapBackendAlertType(type: string | null | undefined): AlertType {
  const value = (type ?? "deterioration_risk").toLowerCase();
  if (value === "stroke_risk") return "stroke_risk";
  if (value.includes("blood_pressure")) return "high_blood_pressure";
  if (value.includes("heart_rate")) return "high_heart_rate";
  if (value.includes("oxygen") || value.includes("spo2")) return "low_oxygen";
  if (value === "high_heart_rate" || value === "low_heart_rate") return value;
  if (value === "low_oxygen" || value === "high_blood_pressure" || value === "low_blood_pressure") {
    return value;
  }
  return "deterioration_risk";
}

export function mapPatientSeed(seed: PatientSeed): Patient {
  return mapDbPatientRow({
    id: seed.id,
    mrn: seed.mrn,
    name: seed.name,
    age: seed.age,
    gender: seed.gender,
    status: seed.status,
    ward_code: seed.ward_code,
    department_code: seed.department_code,
    bed: seed.bed,
    underlying_condition_codes: seed.underlying_condition_codes,
    recent_symptom_codes: seed.recent_symptom_codes,
    medications: seed.medications,
    last_updated: seed.last_updated,
  });
}

export function mapDbPatientRow(row: DbPatientRow): Patient {
  const medications = Array.isArray(row.medications) ? row.medications : [];
  return {
    id: row.id,
    mrn: row.mrn,
    name: row.name,
    age: row.age,
    gender: row.gender as Gender,
    status: mapDbStatus(row.status),
    wardCode: row.ward_code,
    wardLabel: buildLocalizedPair(row.ward_code, {
      [row.ward_code]: text(
        getWardLabelByCode(row.ward_code, "vi"),
        getWardLabelByCode(row.ward_code, "en"),
      ),
    }),
    departmentCode: row.department_code,
    departmentLabel: buildLocalizedPair(row.department_code, {
      [row.department_code]: text(
        getDepartmentLabel(row.department_code, "vi"),
        getDepartmentLabel(row.department_code, "en"),
      ),
    }),
    bed: row.bed ?? undefined,
    underlyingConditionCodes: Array.isArray(row.underlying_condition_codes)
      ? (row.underlying_condition_codes as string[])
      : [],
    medicationCycle: medications.map(
      (item): MedicationCycle => ({
        medication: buildLocalizedPair(item.medication_code, {
          [item.medication_code]: text(
            getMedicationLabel(item.medication_code, "vi"),
            getMedicationLabel(item.medication_code, "en"),
          ),
        }),
        dosage: item.dosage,
        schedule: buildLocalizedPair(item.schedule_code, {
          [item.schedule_code]: text(
            getScheduleLabel(item.schedule_code, "vi"),
            getScheduleLabel(item.schedule_code, "en"),
          ),
        }),
        lastTakenAt: item.last_taken_at,
        nextDoseAt: item.next_dose_at,
      }),
    ),
    recentSymptomCodes: Array.isArray(row.recent_symptom_codes)
      ? (row.recent_symptom_codes as string[])
      : [],
    lastUpdated: row.last_updated,
  };
}

export function mapBackendPatientRow(row: DbBackendPatientRow): Patient {
  const underlyingConditionCodes: string[] = [];
  if (row.medical_history) underlyingConditionCodes.push(row.medical_history);
  if (Array.isArray(row.risk_factors)) {
    for (const factor of row.risk_factors) {
      if (typeof factor === "string" && !underlyingConditionCodes.includes(factor)) {
        underlyingConditionCodes.push(factor);
      }
    }
  }

  return mapDbPatientRow({
    id: row.patient_id,
    mrn: row.patient_id,
    name: row.name,
    age: row.age,
    gender: row.gender,
    status: row.status ?? row.health_status ?? "healthy",
    ward_code: "general_ward",
    department_code: "internal_medicine",
    bed: null,
    underlying_condition_codes: underlyingConditionCodes,
    recent_symptom_codes: [],
    medications: [],
    last_updated: row.updated_at ?? new Date().toISOString(),
  });
}

export function mapAlertSeed(seed: AlertSeed): Alert {
  return mapDbAlertRow({
    id: seed.id,
    patient_id: seed.patient_id,
    type: seed.type,
    severity: seed.severity,
    score: seed.score ?? null,
    evidence: seed.evidence,
    timestamp: seed.timestamp,
    acknowledged: seed.acknowledged,
    workflow_status: "open",
  });
}

export function mapDbAlertRow(row: DbAlertRow): Alert {
  const evidence = Array.isArray(row.evidence)
    ? row.evidence.map((item) =>
        mapEvidence(item as Record<string, unknown>),
      )
    : [];

  return {
    id: row.id,
    patientId: row.patient_id,
    type: row.type as AlertType,
    severity: mapDbSeverity(row.severity),
    score: row.score ?? undefined,
    evidence,
    timestamp: row.timestamp,
    acknowledged: row.acknowledged,
    workflowStatus: (row.workflow_status ?? "open") as AlertWorkflowStatus,
    assignedFloorNurseId: row.assigned_floor_nurse_id ?? undefined,
    assignedZoneCode: row.assigned_zone_code ?? undefined,
    noiseNote: row.noise_note ?? undefined,
    treatment: row.treatment ?? undefined,
  };
}

export function mapBackendAlertRow(row: DbBackendAlertRow): Alert {
  const evidence = Array.isArray(row.features)
    ? row.features.map((item) => mapEvidence(item as Record<string, unknown>))
    : row.features && typeof row.features === "object"
      ? [mapEvidence(row.features as Record<string, unknown>)]
      : row.reason
        ? [{ kind: "patient_context", noteKey: row.reason }]
        : [];

  return mapDbAlertRow({
    id: row.alert_id,
    patient_id: row.patient_id,
    type: mapBackendAlertType(row.alert_type),
    severity: row.severity ?? "warning",
    score: row.confidence ?? null,
    evidence,
    timestamp: row.alert_time ?? new Date().toISOString(),
    acknowledged: row.status === "resolved" || row.status === "acknowledged",
    workflow_status: "open",
  });
}

export function mapVitalSeed(seed: VitalSeed): VitalSignalSample {
  return mapDbVitalRow({
    patient_id: seed.patient_id,
    timestamp: seed.timestamp,
    heart_rate: seed.heart_rate,
    respiratory_rate: seed.respiratory_rate,
    systolic_bp: seed.systolic_bp,
    diastolic_bp: seed.diastolic_bp,
    spo2: seed.spo2,
  });
}

export function mapDbVitalRow(row: DbVitalRow): VitalSignalSample {
  return {
    patientId: row.patient_id,
    timestamp: row.timestamp,
    vitals: {
      heartRate: row.heart_rate ?? undefined,
      respiratoryRate: row.respiratory_rate ?? undefined,
      systolicBp: row.systolic_bp ?? undefined,
      diastolicBp: row.diastolic_bp ?? undefined,
      spo2: row.spo2 ?? undefined,
    },
  };
}

export function mapStaffSeed(seed: StaffSeed): ShiftStaffMember {
  return {
    id: seed.id,
    name: seed.name,
    role: seed.role as ShiftStaffRole,
    zoneCode: seed.zone_code,
    status: seed.status as ShiftStaffStatus,
  };
}

export function mapDbStaffRow(row: {
  id: string;
  name: string;
  role: string;
  zone_code: string;
  status: string;
}): ShiftStaffMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role as ShiftStaffRole,
    zoneCode: row.zone_code,
    status: row.status as ShiftStaffStatus,
  };
}

export function mapDbScheduleRow(row: {
  id: string;
  staff_id: string;
  date: string;
  band: string;
  zone_code: string;
}): ShiftScheduleSlot {
  return {
    id: row.id,
    staffId: row.staff_id,
    date: row.date,
    band: row.band as ShiftBand,
    zoneCode: row.zone_code,
  };
}

export function mapDbActionLogRow(row: {
  id: string;
  alert_id: string;
  action: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  payload: Record<string, unknown>;
  created_at: string;
}): AlertActionLogEntry {
  return {
    id: row.id,
    alertId: row.alert_id,
    action: row.action as AlertActionLogEntry["action"],
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorRole: row.actor_role as OperatorRole,
    payload: row.payload,
    createdAt: row.created_at,
  };
}

export function patientToDbRow(patient: Patient): DbPatientRow {
  return {
    id: patient.id,
    mrn: patient.mrn,
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    status: patient.status,
    ward_code: patient.wardCode,
    department_code: patient.departmentCode ?? "internal_medicine",
    bed: patient.bed ?? null,
    underlying_condition_codes: patient.underlyingConditionCodes,
    recent_symptom_codes: patient.recentSymptomCodes,
    medications: patient.medicationCycle.map((item) => ({
      medication_code: item.medication.vi,
      dosage: item.dosage,
      schedule_code: item.schedule.vi,
      last_taken_at: item.lastTakenAt,
      next_dose_at: item.nextDoseAt,
    })),
    last_updated: patient.lastUpdated,
  };
}

export function alertToDbRow(alert: Alert): DbAlertRow {
  return {
    id: alert.id,
    patient_id: alert.patientId,
    type: alert.type,
    severity: alert.severity,
    score: alert.score ?? null,
    evidence: alert.evidence.map((item) => ({
      kind: item.kind,
      metric: item.metric,
      symptom_code: item.symptomCode,
      value: item.value,
      unit: item.unit,
      timestamp: item.timestamp,
      comparison_value: item.comparisonValue,
      comparison_window: item.comparisonWindow,
      note_key: item.noteKey,
    })),
    timestamp: alert.timestamp,
    acknowledged: alert.acknowledged,
    workflow_status: alert.workflowStatus,
    assigned_floor_nurse_id: alert.assignedFloorNurseId ?? null,
    assigned_zone_code: alert.assignedZoneCode ?? null,
    noise_note: alert.noiseNote ?? null,
    treatment: alert.treatment ?? null,
  };
}

export function buildShift(
  shiftRow: { id: string; ward_code: string; started_at: string; coordinator_id: string | null },
  staff: ShiftStaffMember[],
): Shift {
  return {
    id: shiftRow.id,
    wardCode: shiftRow.ward_code,
    wardLabel: buildLocalizedPair(shiftRow.ward_code, {
      [shiftRow.ward_code]: text(
        getWardLabelByCode(shiftRow.ward_code, "vi"),
        getWardLabelByCode(shiftRow.ward_code, "en"),
      ),
    }),
    startedAt: shiftRow.started_at,
    coordinatorId: shiftRow.coordinator_id ?? "",
    staff,
  };
}
