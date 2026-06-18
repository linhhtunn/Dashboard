import { normalizePatientId } from "@/lib/patient-id";
import type { Locale } from "@/types";

export type AgentChatBackendRequest = {
  schema_version: "v1";
  patient_id?: string | null;
  conversation_id?: string;
  doctor_id?: string;
  message: string;
  metadata?: Record<string, unknown>;
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
};

export function resolveAgentPatientId(patientId: string) {
  const trimmed = patientId.trim();
  if (!trimmed) return trimmed;
  if (/^\d+$/.test(trimmed)) return trimmed;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (/^p\d+$/i.test(trimmed) || trimmed.toLowerCase() === "patient-a") {
    return normalizePatientId(trimmed);
  }
  return trimmed;
}

export function resolveDoctorId(userId?: string) {
  if (!userId || userId === "clinician-local") return "D1";
  return userId;
}

export function buildAgentChatBackendBody(input: {
  patientId: string;
  message: string;
  conversationId?: string;
  doctorId?: string;
  metadata?: Record<string, unknown>;
  history?: AgentChatBackendRequest["history"];
}): AgentChatBackendRequest {
  const body: AgentChatBackendRequest = {
    schema_version: "v1",
    message: input.message.trim(),
    doctor_id: resolveDoctorId(input.doctorId),
  };
  const patientId = resolveAgentPatientId(input.patientId);

  if (patientId) {
    body.patient_id = patientId;
  }

  if (input.conversationId) {
    body.conversation_id = input.conversationId;
  }

  const metadata = buildAgentBackendMetadata(input.metadata);
  if (Object.keys(metadata).length > 0) {
    body.metadata = metadata;
  }

  return body;
}

export function buildAgentBackendMetadata(
  metadata?: Record<string, unknown>,
): Record<string, string> {
  if (!metadata) return {};

  const output: Record<string, string> = {};
  const alertId = metadata.alert_id;
  const contextType = metadata.context_type ?? metadata.source_view;

  if (typeof alertId === "string" && alertId.trim()) {
    output.alert_id = alertId.trim().slice(0, 200);
  }

  if (typeof contextType === "string" && contextType.trim()) {
    output.context_type = contextType.trim().slice(0, 200);
  }

  return output;
}

export function buildSummaryPrompt(locale: Locale) {
  return locale === "vi"
    ? "Tóm tắt bệnh án của bệnh nhân này."
    : "Summarize this patient's clinical record.";
}

export function buildExplainAlertPrompt(locale: Locale) {
  return locale === "vi"
    ? "Giải thích cảnh báo lâm sàng này và các bằng chứng liên quan."
    : "Explain this clinical alert and the related evidence.";
}
