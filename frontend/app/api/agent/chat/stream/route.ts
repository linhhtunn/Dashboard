import { NextRequest } from "next/server";

import { adaptBackendResponse, buildThreadTitle } from "@/lib/ai/agent-adapter";
import { resolveAgentPatientId } from "@/lib/ai/agent-chat-request";
import { isAgentBackendConfigured } from "@/lib/ai/agent-backend";
import { BackendAgentError, invokeAgentChatStream } from "@/lib/ai/invoke-agent-chat";
import { buildMockChatPayload } from "@/lib/ai/mock-chat";
import type {
  AgentChatProxyPayload,
  AgentChatProxyRequest,
  AgentChatStreamEvent,
} from "@/lib/ai/types";

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

  if (!isAgentBackendConfigured()) {
    const payload = buildMockChatPayload({
      locale: body.locale,
      message: body.message,
      patientId: normalizedPatientId,
      patientContext: null,
      threadId: body.threadId,
      title,
    });
    return createMockStreamResponse(payload, { typingDelayMs: 90 });
  }

  try {
    const backendResponse = await invokeAgentChatStream({
      patientId: normalizedPatientId,
      conversationId: body.threadId,
      doctorId: body.userId,
      message: body.message,
      metadata: body.metadata,
      history: body.history,
    });

    return createBackendStreamResponse(backendResponse, {
      patientId: normalizedPatientId,
      locale: body.locale,
      question: body.message,
      threadId: body.threadId,
      title,
    });
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

function createBackendStreamResponse(
  backendResponse: Response,
  context: {
    patientId: string;
    locale: AgentChatProxyRequest["locale"];
    question: string;
    threadId: string;
    title: string;
  },
) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const backendBody = backendResponse.body;

  const stream = new ReadableStream({
    async start(controller) {
      if (!backendBody) {
        controller.error(new Error("Backend AI stream rỗng."));
        return;
      }

      const send = (event: AgentChatStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      send({
        type: "meta",
        threadId: context.threadId,
        title: context.title,
        suggestedIssueIds: [],
      });

      const reader = backendBody.getReader();
      let buffer = "";
      let streamedText = "";
      let completedPayload: AgentChatProxyPayload | null = null;

      const processBlock = (block: string) => {
        const parsed = parseSseBlock(block);
        if (!parsed) return;

        if (parsed.event === "token") {
          streamedText += parsed.data;
          send({ type: "delta", text: parsed.data });
          return;
        }

        if (parsed.event === "result") {
          const raw = JSON.parse(parsed.data) as unknown;
          completedPayload = {
            ...adaptBackendResponse({
              patientId: context.patientId,
              locale: context.locale,
              question: context.question,
              title: context.title,
              raw,
            }),
            threadId: context.threadId,
          };
          send({ type: "complete", payload: completedPayload });
          return;
        }

        if (parsed.event === "error") {
          throw new Error(parsed.data || "Backend AI trả về lỗi stream.");
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\n\n/);
        buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          processBlock(block);
        }
      }

      if (buffer.trim()) {
        processBlock(buffer);
      }

      if (!completedPayload && streamedText.trim()) {
        completedPayload = {
          ...adaptBackendResponse({
            patientId: context.patientId,
            locale: context.locale,
            question: context.question,
            title: context.title,
            raw: {
              schema_version: "v1",
              response_type: "chat",
              patient_id: context.patientId || null,
              source_id: context.threadId,
              generated_at: new Date().toISOString(),
              narrative_summary: streamedText,
            },
          }),
          threadId: context.threadId,
        };
        send({ type: "complete", payload: completedPayload });
      }

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

function parseSseBlock(block: string) {
  const lines = block.split(/\r?\n/);
  let event = "message";
  const data: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    }
    if (line.startsWith("data:")) {
      data.push(line.slice("data:".length).trimStart());
    }
  }

  if (data.length === 0) return null;
  return { event, data: data.join("\n") };
}

function createMockStreamResponse(
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
