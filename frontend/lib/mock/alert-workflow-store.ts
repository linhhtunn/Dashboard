import { getPatientById, updatePatientStatus } from "@/lib/server/clinical-store";
import type {
  AlertActionLogEntry,
  AlertTreatmentRecord,
  AlertWorkflowStatus,
  OperatorRole,
} from "@/types";

type WorkflowState = {
  workflowStatus: AlertWorkflowStatus;
  assignedFloorNurseId?: string;
  assignedZoneCode?: string;
  noiseNote?: string;
  treatment?: AlertTreatmentRecord;
};

const workflowByAlertId = new Map<string, WorkflowState>();
const actionLogs: AlertActionLogEntry[] = [];

function getOrCreate(alertId: string): WorkflowState {
  const existing = workflowByAlertId.get(alertId);
  if (existing) return existing;
  const initial: WorkflowState = { workflowStatus: "open" };
  workflowByAlertId.set(alertId, initial);
  return initial;
}

export function getAlertWorkflow(alertId: string): WorkflowState {
  return structuredClone(getOrCreate(alertId));
}

export function listPendingDoctorConfirmations(): string[] {
  return [...workflowByAlertId.entries()]
    .filter(([, state]) =>
      ["nurse_treated", "noise", "needs_follow_up"].includes(state.workflowStatus),
    )
    .map(([alertId]) => alertId);
}

function appendLog(entry: Omit<AlertActionLogEntry, "id" | "createdAt">): AlertActionLogEntry {
  const next: AlertActionLogEntry = {
    ...entry,
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  actionLogs.push(next);
  return structuredClone(next);
}

export function getAlertActionHistory(alertId: string): AlertActionLogEntry[] {
  return actionLogs
    .filter((entry) => entry.alertId === alertId)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .map((entry) => structuredClone(entry));
}

function setPatientRecentSymptom(patientId: string) {
  const patient = getPatientById(patientId);
  if (patient && patient.status !== "critical") {
    updatePatientStatus(patientId, "recent_symptom");
  }
}

export type NurseTreatInput = {
  symptomsBefore: string;
  actionTaken: string;
  symptomsAfter: string;
  outcome: "completed" | "needs_follow_up";
  floorNurseId: string;
  floorNurseName: string;
  zoneCode: string;
  followUpNote?: string;
  actorId: string;
  actorName: string;
};

export function recordNurseTreatment(
  alertId: string,
  patientId: string,
  input: NurseTreatInput,
): WorkflowState {
  const state = getOrCreate(alertId);
  const treatment: AlertTreatmentRecord = {
    symptomsBefore: input.symptomsBefore,
    actionTaken: input.actionTaken,
    symptomsAfter: input.symptomsAfter,
    outcome: input.outcome,
    floorNurseId: input.floorNurseId,
    floorNurseName: input.floorNurseName,
    zoneCode: input.zoneCode,
    followUpNote: input.followUpNote,
    recordedById: input.actorId,
    recordedByName: input.actorName,
    recordedAt: new Date().toISOString(),
  };

  if (input.outcome === "needs_follow_up") {
    state.workflowStatus = "needs_follow_up";
    setPatientRecentSymptom(patientId);
  } else {
    state.workflowStatus = "nurse_treated";
  }

  state.treatment = treatment;
  state.assignedFloorNurseId = input.floorNurseId;
  state.assignedZoneCode = input.zoneCode;
  workflowByAlertId.set(alertId, state);

  appendLog({
    alertId,
    action: input.outcome === "needs_follow_up" ? "needs_follow_up" : "nurse_treat",
    actorId: input.actorId,
    actorName: input.actorName,
    actorRole: "coordinator",
    payload: { ...treatment },
  });

  return structuredClone(state);
}

export function recordNoise(
  alertId: string,
  description: string,
  actorId: string,
  actorName: string,
): WorkflowState {
  const state = getOrCreate(alertId);
  state.workflowStatus = "noise";
  state.noiseNote = description;
  workflowByAlertId.set(alertId, state);

  appendLog({
    alertId,
    action: "mark_noise",
    actorId,
    actorName,
    actorRole: "coordinator",
    payload: { description },
  });

  return structuredClone(state);
}

export function recordDoctorConfirm(
  alertId: string,
  conclusion: string,
  actorId: string,
  actorName: string,
): WorkflowState {
  const state = getOrCreate(alertId);
  if (!["nurse_treated", "noise", "needs_follow_up"].includes(state.workflowStatus)) {
    throw new Error("Alert is not awaiting doctor confirmation.");
  }

  state.workflowStatus = "doctor_confirmed";
  if (state.treatment) {
    state.treatment = {
      ...state.treatment,
      doctorConclusion: conclusion,
      doctorConfirmedAt: new Date().toISOString(),
    };
  } else if (state.noiseNote) {
    state.treatment = {
      symptomsBefore: "",
      actionTaken: state.noiseNote,
      symptomsAfter: "",
      outcome: "completed",
      floorNurseId: "",
      floorNurseName: "",
      zoneCode: "",
      recordedById: actorId,
      recordedByName: actorName,
      recordedAt: new Date().toISOString(),
      doctorConclusion: conclusion,
      doctorConfirmedAt: new Date().toISOString(),
    };
  }

  workflowByAlertId.set(alertId, state);

  appendLog({
    alertId,
    action: "doctor_confirm",
    actorId,
    actorName,
    actorRole: "doctor",
    payload: { conclusion },
  });

  return structuredClone(state);
}

export function enrichAlertDto<T extends { id: string; patient_id: string }>(
  dto: T,
): T & {
  workflow_status: AlertWorkflowStatus;
  assigned_floor_nurse_id: string | null;
  assigned_zone_code: string | null;
  noise_note: string | null;
  treatment: AlertTreatmentRecord | null;
} {
  const state = getOrCreate(dto.id);
  return {
    ...dto,
    workflow_status: state.workflowStatus,
    assigned_floor_nurse_id: state.assignedFloorNurseId ?? null,
    assigned_zone_code: state.assignedZoneCode ?? null,
    noise_note: state.noiseNote ?? null,
    treatment: state.treatment ?? null,
  };
}
