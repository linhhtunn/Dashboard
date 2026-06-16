import type { ThreadDetail, ThreadMessage, ThreadMeta } from "@/lib/ai/types";
import { normalizePatientId } from "@/lib/patient-id";

type ThreadMetaDto = {
  conversation_id: string;
  doctor_id: string;
  patient_id: string | null;
  title: string;
  last_message_at: string;
  last_issue: string | null;
  last_intent: string | null;
};

type ThreadDetailDto = {
  meta: ThreadMetaDto;
  messages: Array<{
    role: string;
    content: string;
  }>;
};

export function createThreadId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `thread-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function mapThreadMeta(dto: ThreadMetaDto): ThreadMeta {
  return {
    threadId: dto.conversation_id,
    patientId: dto.patient_id ? normalizePatientId(dto.patient_id) : "GENERAL",
    title: dto.title,
    updatedAt: dto.last_message_at,
    lastIssue: dto.last_issue ?? dto.last_intent ?? "General",
  };
}

function mapThreadMessages(
  messages: ThreadDetailDto["messages"],
): ThreadMessage[] {
  return messages
    .filter(
      (message): message is { role: "user" | "assistant"; content: string } =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string",
    )
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

export async function listThreadMeta(
  patientId: string,
  doctorId: string,
): Promise<ThreadMeta[]> {
  const search = new URLSearchParams();
  search.set("doctor_id", doctorId);
  if (patientId) search.set("patient_id", normalizePatientId(patientId));

  const response = await fetch(`/api/threads?${search.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = (await response.json()) as ThreadMetaDto[];
  return payload.map(mapThreadMeta);
}

export async function getThreadDetail(
  conversationId: string,
): Promise<ThreadDetail | null> {
  const response = await fetch(`/api/threads/${conversationId}`, {
    cache: "no-store",
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = (await response.json()) as ThreadDetailDto;
  return {
    meta: mapThreadMeta(payload.meta),
    messages: mapThreadMessages(payload.messages),
  };
}
