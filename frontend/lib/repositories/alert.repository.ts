import type { Alert, AlertSeverity, Evidence } from "@/types";
import { getApiErrorMessage } from "@/lib/api-response";
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

export const alertRepository = {
  async list(): Promise<Alert[]> {
    const response = await fetch("/api/alerts", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(await getApiErrorMessage(response, "Unable to load alerts"));
    }
    const payload = (await response.json()) as AlertDto[];
    return payload.map(mapAlert);
  },

  async listOpen(): Promise<Alert[]> {
    const alerts = await this.list();
    return alerts.filter((alert) => !alert.acknowledged);
  },

  async listByPatient(patientId: string): Promise<Alert[]> {
    const normalizedPatientId = normalizePatientId(patientId);
    const response = await fetch(`/api/patients/${normalizedPatientId}/alerts`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(await getApiErrorMessage(response, "Unable to load patient alerts"));
    }
    const payload = (await response.json()) as AlertDto[];
    return payload.map(mapAlert);
  },
};
