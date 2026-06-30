import {
  appendAlertActionLog,
  getAlertActionHistory,
  getAlertById,
  listPendingDoctorConfirmations,
  updateAlertWorkflow,
  updatePatientStatus,
} from "@/lib/server/clinical-db";
import { transitionAlertWorkflow } from "@/lib/alerts/state-machine";
import { markAlertDeliveryAcknowledged } from "@/lib/server/alert-delivery";
import type {
  AlertSeverity,
  AlertTreatmentRecord,
  AlertWorkflowStatus,
} from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export { listPendingDoctorConfirmations, getAlertActionHistory };

export async function recordAcknowledgement(
  alertId: string,
  actorId: string,
  actorName: string,
  writeClient?: SupabaseClient,
) {
  const current = await getAlertWorkflow(alertId);
  const workflowStatus = transitionAlertWorkflow(current.workflowStatus, "acknowledge", "info");
  const acknowledgedAt = new Date().toISOString();
  await updateAlertWorkflow(
    alertId,
    {
      workflow_status: workflowStatus,
      acknowledged: true,
      acknowledged_at: acknowledgedAt,
      acknowledged_by: actorId,
    },
    writeClient,
  );
  await appendAlertActionLog(
    {
      alertId,
      action: "acknowledge",
      actorId,
      actorName,
      actorRole: "coordinator",
      payload: { acknowledgedAt },
    },
    writeClient,
  );
  await markAlertDeliveryAcknowledged(alertId, acknowledgedAt);
  return getAlertWorkflow(alertId);
}

export async function getAlertWorkflow(alertId: string) {
  const alert = await getAlertById(alertId);
  if (!alert) {
    return { workflowStatus: "open" as AlertWorkflowStatus };
  }
  return {
    workflowStatus: alert.workflowStatus,
    assignedFloorNurseId: alert.assignedFloorNurseId,
    assignedZoneCode: alert.assignedZoneCode,
    noiseNote: alert.noiseNote,
    treatment: alert.treatment,
  };
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

async function setPatientRecentSymptom(patientId: string, writeClient?: SupabaseClient) {
  const { getPatientById } = await import("@/lib/server/clinical-db");
  const patient = await getPatientById(patientId);
  if (patient && patient.status !== "critical") {
    await updatePatientStatus(patientId, "recent_symptom", writeClient);
  }
}

export async function recordNurseTreatment(
  alertId: string,
  patientId: string,
  input: NurseTreatInput,
  writeClient?: SupabaseClient,
) {
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

  const current = await getAlertWorkflow(alertId);
  const action = input.outcome === "needs_follow_up" ? "needs_follow_up" : "nurse_treat";
  const workflowStatus: AlertWorkflowStatus = transitionAlertWorkflow(
    current.workflowStatus,
    action,
    "info",
  );

  if (input.outcome === "needs_follow_up") {
    await setPatientRecentSymptom(patientId, writeClient);
  }

  await updateAlertWorkflow(alertId, {
    workflow_status: workflowStatus,
    assigned_floor_nurse_id: input.floorNurseId,
    assigned_zone_code: input.zoneCode,
    treatment,
  }, writeClient);

  await appendAlertActionLog({
    alertId,
    action: input.outcome === "needs_follow_up" ? "needs_follow_up" : "nurse_treat",
    actorId: input.actorId,
    actorName: input.actorName,
    actorRole: "coordinator",
    payload: { ...treatment },
  }, writeClient);

  return getAlertWorkflow(alertId);
}

export async function recordNoise(
  alertId: string,
  severity: AlertSeverity,
  description: string,
  actorId: string,
  actorName: string,
  writeClient?: SupabaseClient,
) {
  const current = await getAlertWorkflow(alertId);
  const workflowStatus = transitionAlertWorkflow(current.workflowStatus, "mark_noise", severity);
  await updateAlertWorkflow(alertId, {
    workflow_status: workflowStatus,
    noise_note: description,
  }, writeClient);

  await appendAlertActionLog({
    alertId,
    action: "mark_noise",
    actorId,
    actorName,
    actorRole: "coordinator",
    payload: { description, reviewRequired: workflowStatus === "suspected_noise" },
  }, writeClient);

  return getAlertWorkflow(alertId);
}

export async function recordDoctorConfirm(
  alertId: string,
  conclusion: string,
  actorId: string,
  actorName: string,
  writeClient?: SupabaseClient,
) {
  const current = await getAlertWorkflow(alertId);
  const workflowStatus = transitionAlertWorkflow(
    current.workflowStatus,
    "doctor_confirm",
    "info",
  );

  const treatment: AlertTreatmentRecord | undefined = current.treatment
    ? {
        ...current.treatment,
        doctorConclusion: conclusion,
        doctorConfirmedAt: new Date().toISOString(),
      }
    : current.noiseNote
      ? {
          symptomsBefore: "",
          actionTaken: current.noiseNote,
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
        }
      : undefined;

  await updateAlertWorkflow(alertId, {
    workflow_status: workflowStatus,
    treatment: treatment ?? null,
  }, writeClient);

  await appendAlertActionLog({
    alertId,
    action: "doctor_confirm",
    actorId,
    actorName,
    actorRole: "doctor",
    payload: { conclusion },
  }, writeClient);

  return getAlertWorkflow(alertId);
}

export async function recordDoctorConfirmNoise(
  alertId: string,
  conclusion: string,
  actorId: string,
  actorName: string,
  writeClient?: SupabaseClient,
) {
  const current = await getAlertWorkflow(alertId);
  const workflowStatus = transitionAlertWorkflow(
    current.workflowStatus,
    "doctor_confirm_noise",
    "critical",
  );
  await updateAlertWorkflow(alertId, { workflow_status: workflowStatus }, writeClient);
  await appendAlertActionLog(
    {
      alertId,
      action: "doctor_confirm_noise",
      actorId,
      actorName,
      actorRole: "doctor",
      payload: { conclusion, originalNoiseNote: current.noiseNote ?? null },
    },
    writeClient,
  );
  return getAlertWorkflow(alertId);
}

export async function enrichAlertDto<T extends { id: string; patient_id: string }>(
  dto: T,
): Promise<
  T & {
    workflow_status: AlertWorkflowStatus;
    assigned_floor_nurse_id: string | null;
    assigned_zone_code: string | null;
    noise_note: string | null;
    treatment: AlertTreatmentRecord | null;
  }
> {
  const state = await getAlertWorkflow(dto.id);
  return {
    ...dto,
    workflow_status: state.workflowStatus,
    assigned_floor_nurse_id: state.assignedFloorNurseId ?? null,
    assigned_zone_code: state.assignedZoneCode ?? null,
    noise_note: state.noiseNote ?? null,
    treatment: state.treatment ?? null,
  };
}
