import type {
  Alert,
  AlertActionLogEntry,
  AlertSeverity,
  AlertTreatmentRecord,
  AlertWorkflowStatus,
  Evidence,
  OperatorRole,
} from "@/types";
import { clinicalApiGet, clinicalApiSend } from "@/lib/api/client";
import { operatorRoleHeaders } from "@/lib/operator-role";
import { normalizePatientId } from "@/lib/patient-id";

type AlertDto = {
  id: string;
  patient_id: string;
  type: Alert["type"];
  severity: Alert["severity"];
  score?: number | null;
  evidence: Array<Record<string, unknown>>;
  timestamp: string;
  acknowledged: boolean;
  message: string;
  workflow_status?: AlertWorkflowStatus;
  assigned_floor_nurse_id?: string | null;
  assigned_zone_code?: string | null;
  assigned_doctor_user_id?: string | null;
  noise_note?: string | null;
  treatment?: AlertTreatmentRecord | null;
};

function mapEvidence(input: Record<string, unknown>): Evidence {
  return {
    kind: (input.kind as Evidence["kind"]) ?? "patient_context",
    metric: input.metric as Evidence["metric"] | undefined,
    symptomCode: input.symptom_code as string | undefined,
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

function mapAlert(dto: AlertDto): Alert {
  return {
    id: dto.id,
    patientId: dto.patient_id,
    type: dto.type,
    severity: normalizeAlertSeverity(dto.severity),
    score: dto.score ?? undefined,
    evidence: dto.evidence.map(mapEvidence),
    timestamp: dto.timestamp,
    acknowledged: dto.acknowledged,
    workflowStatus: dto.workflow_status ?? "open",
    assignedFloorNurseId: dto.assigned_floor_nurse_id ?? undefined,
    assignedZoneCode: dto.assigned_zone_code ?? undefined,
    assignedDoctorUserId: dto.assigned_doctor_user_id ?? undefined,
    noiseNote: dto.noise_note ?? undefined,
    treatment: dto.treatment ?? undefined,
  };
}

function normalizeAlertSeverity(severity: string): AlertSeverity {
  switch (severity.toLowerCase()) {
    case "critical":
    case "high":
      return "critical";
    case "warning":
    case "medium":
      return "warning";
    case "info":
    case "low":
    default:
      return "info";
  }
}

export type AlertActionRequest =
  | {
      action: "nurse_treat";
      symptomsBefore: string;
      actionTaken: string;
      symptomsAfter: string;
      outcome?: "completed" | "needs_follow_up";
      floorNurseId: string;
      doctorUserId: string;
      zone?: string;
    }
  | {
      action: "needs_follow_up";
      symptomsBefore: string;
      actionTaken: string;
      symptomsAfter: string;
      floorNurseId: string;
      zone?: string;
      followUpNote?: string;
    }
  | { action: "mark_noise"; description: string; doctorUserId: string }
  | {
      action: "doctor_confirm";
      conclusion: string;
      symptoms: string;
      clinicalNotes: string;
      startedAt: string;
    };

type AlertListParams = {
  limit?: number;
  offset?: number;
  patientId?: string;
};

const DEFAULT_ALERT_LIMIT = 50;
const MAX_ALERT_LIMIT = 200;

function buildAlertQuery(params?: AlertListParams) {
  const search = new URLSearchParams();
  const limit = Math.min(params?.limit ?? DEFAULT_ALERT_LIMIT, MAX_ALERT_LIMIT);
  search.set("limit", String(limit));
  search.set("offset", String(params?.offset ?? 0));
  if (params?.patientId) search.set("patientId", normalizePatientId(params.patientId));
  return search.toString();
}

export const alertRepository = {
  async list(params?: AlertListParams): Promise<Alert[]> {
    const payload = await clinicalApiGet<AlertDto[]>(
      `/api/alerts?${buildAlertQuery(params)}`,
    );
    return payload.map(mapAlert);
  },

  async listOpen(): Promise<Alert[]> {
    const alerts = await this.list({ limit: MAX_ALERT_LIMIT });
    return alerts.filter((alert) => alert.workflowStatus !== "doctor_confirmed");
  },

  async listByPatient(patientId: string, params?: Omit<AlertListParams, "patientId">): Promise<Alert[]> {
    const normalizedPatientId = normalizePatientId(patientId);
    const payload = await clinicalApiGet<AlertDto[]>(
      `/api/patients/${normalizedPatientId}/alerts?${buildAlertQuery(params)}`,
    );
    return payload.map(mapAlert);
  },

  async submitAction(
    alertId: string,
    body: AlertActionRequest,
    role: OperatorRole,
  ): Promise<Alert> {
    await clinicalApiSend(`/api/alerts/${alertId}/actions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await operatorRoleHeaders(role)),
      },
      body: JSON.stringify(body),
    });

    const alerts = await this.list({ limit: MAX_ALERT_LIMIT });
    const updated = alerts.find((alert) => alert.id === alertId);
    if (!updated) {
      throw new Error("Alert not found after action.");
    }
    return updated;
  },

  async getHistory(alertId: string): Promise<AlertActionLogEntry[]> {
    return clinicalApiGet<AlertActionLogEntry[]>(`/api/alerts/${alertId}/history`);
  },
};
