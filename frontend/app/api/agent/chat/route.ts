import { NextRequest } from "next/server";

import { adaptBackendResponse, buildThreadTitle } from "@/lib/ai/agent-adapter";
import { buildMockChatPayload } from "@/lib/ai/mock-chat";
import { BackendAgentError, invokeAgentChat } from "@/lib/ai/invoke-agent-chat";
import { isAgentBackendConfigured } from "@/lib/ai/agent-backend";
import type {
  AgentChatProxyPayload,
  AgentChatProxyRequest,
  AgentChatStreamEvent,
} from "@/lib/ai/types";
import { resolveAgentPatientId } from "@/lib/ai/agent-chat-request";
import { getAiMode, isDemoModeAllowed } from "@/lib/runtime-config";
import { resolveBackendAuthorization } from "@/lib/ai/backend-authorization";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AgentChatProxyRequest;
  const normalizedPatientId = resolveAgentPatientId(body.patientId ?? "");

  if (!body.message?.trim() || !body.threadId) {
    return new Response("Thiếu dữ liệu bắt buộc cho request chatbot.", {
      status: 400,
    });
  }

  const title = buildThreadTitle(body.message, body.locale);

  if (getAiMode() === "off") {
    return new Response("Clinical AI is disabled.", { status: 503 });
  }

  if (!isAgentBackendConfigured()) {
    if (!isDemoModeAllowed()) {
      return new Response("Clinical AI backend is unavailable.", { status: 503 });
    }
    const payload = buildMockChatPayload({
      locale: body.locale,
      message: body.message,
      patientId: normalizedPatientId,
      patientContext: null,
      threadId: body.threadId,
      title,
    });
    return createStreamResponse(payload, { typingDelayMs: 90 });
  }

  try {
    const raw = await invokeAgentChat({
      patientId: normalizedPatientId,
      conversationId: body.threadId,
      doctorId: body.userId,
      message: body.message,
      metadata: body.metadata,
      history: body.history,
      authorization: await resolveBackendAuthorization(request),
    });

    const payload = {
      ...adaptBackendResponse({
        patientId: normalizedPatientId,
        locale: body.locale,
        question: body.message,
        title,
        raw,
      }),
      threadId: body.threadId,
    };

    return createStreamResponse(payload, { typingDelayMs: 70 });
  } catch (error) {
    if (error instanceof BackendAgentError && error.status < 500) {
      return new Response(error.message, { status: error.status });
    }

    const message =
      error instanceof Error
        ? error.message
        : "Không thể kết nối backend AI.";
    return new Response(message, { status: 502 });
  }
}

function createStreamResponse(
  payload: AgentChatProxyPayload,
  options: { typingDelayMs: number },
) {
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
        send({
          type: "delta",
          text: chunk,
        });
      }

      await sleep(Math.max(40, Math.round(options.typingDelayMs / 2)));
      send({
        type: "complete",
        payload,
      });

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

function chunkText(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [text];

  const chunks: string[] = [];
  for (let index = 0; index < words.length; index += 4) {
    const slice = words.slice(index, index + 4).join(" ");
    const suffix = index + 4 < words.length ? " " : "";
    chunks.push(`${slice}${suffix}`);
  }

  return chunks;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
