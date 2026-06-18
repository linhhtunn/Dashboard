import { NextRequest } from "next/server";

import { adaptBackendResponse, buildThreadTitle } from "@/lib/ai/agent-adapter";
import { BackendAgentError, getAgentBaseUrl, isAgentBackendConfigured } from "@/lib/ai/agent-backend";
import { buildAgentChatBackendBody, resolveAgentPatientId } from "@/lib/ai/agent-chat-request";
import { buildMockChatPayload } from "@/lib/ai/mock-chat";
import type {
  AgentChatProxyPayload,
  AgentChatProxyRequest,
  AgentChatStreamEvent,
} from "@/lib/ai/types";
import type { Locale } from "@/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AgentChatProxyRequest;
  const normalizedPatientId = resolveAgentPatientId(body.patientId ?? "");

  if (!body.message?.trim() || !body.threadId) {
    return new Response("Thiếu dữ liệu bắt buộc cho request chatbot.", { status: 400 });
  }

  const title = buildThreadTitle(body.message, body.locale);

  if (!isAgentBackendConfigured()) {
    const payload = buildMockChatPayload({
      locale: body.locale,
      message: body.message,
      patientId: normalizedPatientId,
      patientContext: null,
      threadId: body.threadId,
      title,
    });
    return createNdjsonStream(payload, { typingDelayMs: 90 });
  }

  const baseUrl = getAgentBaseUrl()!;
  const backendBody = buildAgentChatBackendBody({
    patientId: normalizedPatientId,
    conversationId: body.threadId,
    doctorId: body.userId,
    message: body.message,
    metadata: body.metadata,
    history: body.history,
  });

  try {
    const streamPath = process.env.AI_AGENT_STREAM_PATH ?? "/api/agent/chat/stream";
    const backendResponse = await fetch(
      `${baseUrl.replace(/\/$/, "")}${streamPath}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(request.headers.get("authorization")
            ? { Authorization: request.headers.get("authorization") as string }
            : {}),
        },
        body: JSON.stringify(backendBody),
        cache: "no-store",
      },
    );

    if (!backendResponse.ok) {
      const detail = await backendResponse.text();
      throw new BackendAgentError(
        detail || `Backend AI trả lời ${backendResponse.status}.`,
        backendResponse.status,
      );
    }

    return proxySseAsNdjson(backendResponse, {
      patientId: normalizedPatientId,
      locale: body.locale,
      message: body.message,
      threadId: body.threadId,
      title,
    });
  } catch (error) {
    if (error instanceof BackendAgentError && error.status < 500) {
      return new Response(error.message, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Không thể kết nối backend AI.";
    return new Response(message, { status: 502 });
  }
}

// ---------------------------------------------------------------------------
// SSE → NDJSON proxy
// ---------------------------------------------------------------------------

type StreamCtx = {
  patientId: string;
  locale: Locale;
  message: string;
  threadId: string;
  title: string;
};

function proxySseAsNdjson(backendResponse: Response, ctx: StreamCtx): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AgentChatStreamEvent) => {
        controller.enqueue(`${JSON.stringify(event)}\n`);
      };

      send({ type: "meta", threadId: ctx.threadId, title: ctx.title, suggestedIssueIds: [] });

      try {
        for await (const { event, data } of parseSse(backendResponse)) {
          if (event === "token") {
            if (data) send({ type: "delta", text: data });
          } else if (event === "result") {
            try {
              const raw: unknown = JSON.parse(data);
              const adapted = adaptBackendResponse({
                patientId: ctx.patientId,
                locale: ctx.locale,
                question: ctx.message,
                title: ctx.title,
                raw,
              });
              const payload: AgentChatProxyPayload = { ...adapted, threadId: ctx.threadId };
              send({ type: "complete", payload });
            } catch {
              // malformed result — skip
            }
          }
        }
      } catch {
        // upstream read error — close gracefully
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

// ---------------------------------------------------------------------------
// Mock fallback
// ---------------------------------------------------------------------------

function createNdjsonStream(
  payload: AgentChatProxyPayload,
  options: { typingDelayMs: number },
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AgentChatStreamEvent) => {
        controller.enqueue(`${JSON.stringify(event)}\n`);
      };

      send({
        type: "meta",
        threadId: payload.threadId,
        title: payload.title,
        suggestedIssueIds: payload.suggestedIssueIds,
      });

      for (const chunk of chunkText(payload.summary.answer)) {
        await sleep(options.typingDelayMs);
        send({ type: "delta", text: chunk });
      }

      await sleep(Math.max(40, Math.round(options.typingDelayMs / 2)));
      send({ type: "complete", payload });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

// ---------------------------------------------------------------------------
// SSE parser
// ---------------------------------------------------------------------------

async function* parseSse(
  response: Response,
): AsyncGenerator<{ event: string; data: string }> {
  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "message";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trimEnd();
        if (trimmed.startsWith("event:")) {
          currentEvent = trimmed.slice(6).trim();
        } else if (trimmed.startsWith("data:")) {
          const data = trimmed.slice(5).trim();
          if (data) {
            yield { event: currentEvent, data };
            currentEvent = "message";
          }
        } else if (trimmed === "") {
          currentEvent = "message";
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function chunkText(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [text];

  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += 4) {
    const slice = words.slice(i, i + 4).join(" ");
    chunks.push(i + 4 < words.length ? `${slice} ` : slice);
  }
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
