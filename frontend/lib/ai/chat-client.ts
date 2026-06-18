"use client";

import type {
  AgentChatProxyPayload,
  AgentChatProxyRequest,
  AgentChatStreamEvent,
  AgentExplainAlertProxyRequest,
  AgentInsightPayload,
  AgentSummaryProxyRequest,
} from "@/lib/ai/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type StreamHandlers = {
  onMeta?: (event: Extract<AgentChatStreamEvent, { type: "meta" }>) => void;
  onDelta?: (event: Extract<AgentChatStreamEvent, { type: "delta" }>) => void;
  onComplete?: (
    event: Extract<AgentChatStreamEvent, { type: "complete" }>,
  ) => void;
};

export async function streamAgentChat(
  input: AgentChatProxyRequest,
  handlers: StreamHandlers,
): Promise<AgentChatProxyPayload> {
  const authorization = await getAgentAuthorizationHeader();
  const response = await fetch("/api/agent/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Không thể kết nối tới backend AI.");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Phản hồi từ backend AI không có stream để đọc.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let completedPayload: AgentChatProxyPayload | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const event = JSON.parse(trimmed) as AgentChatStreamEvent;

      if (event.type === "meta") {
        handlers.onMeta?.(event);
      } else if (event.type === "delta") {
        handlers.onDelta?.(event);
      } else if (event.type === "complete") {
        completedPayload = event.payload;
        handlers.onComplete?.(event);
      }
    }
  }

  if (buffer.trim()) {
    const event = JSON.parse(buffer.trim()) as AgentChatStreamEvent;
    if (event.type === "complete") {
      completedPayload = event.payload;
      handlers.onComplete?.(event);
    }
  }

  if (!completedPayload) {
    throw new Error("Backend AI không trả về gói hoàn tất hợp lệ.");
  }

  return completedPayload;
}

async function getAgentAuthorizationHeader() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? `Bearer ${token}` : null;
}

export async function fetchAgentSummary(
  input: AgentSummaryProxyRequest,
): Promise<AgentInsightPayload> {
  return fetchAgentJson("/api/agent/summary", input);
}

export async function fetchAgentAlertExplanation(
  input: AgentExplainAlertProxyRequest,
): Promise<AgentInsightPayload> {
  return fetchAgentJson("/api/agent/explain-alert", input);
}

async function fetchAgentJson<TInput>(
  path: string,
  input: TInput,
): Promise<AgentInsightPayload> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const raw = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      raw && typeof raw === "object" && "error" in raw
        ? String(raw.error)
        : "Không thể kết nối tới backend AI.";
    throw new Error(message);
  }

  return raw as AgentInsightPayload;
}
