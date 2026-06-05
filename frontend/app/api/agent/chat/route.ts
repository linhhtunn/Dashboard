import { NextRequest } from "next/server";

import { adaptBackendResponse, buildThreadTitle } from "@/lib/ai/agent-adapter";
import {
  BackendAgentError,
  agentDefaultPaths,
  callAgentEndpoint,
  getAgentBaseUrl,
  getAgentPath,
} from "@/lib/ai/agent-backend";
import type {
  AgentChatProxyRequest,
  AgentChatStreamEvent,
} from "@/lib/ai/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AgentChatProxyRequest;
  const baseUrl = getAgentBaseUrl();
  const configuredPath = getAgentPath("chat");

  if (!baseUrl) {
    return new Response("AI_AGENT_BASE_URL chưa được cấu hình.", { status: 500 });
  }

  if (!body.message?.trim() || !body.threadId || !body.patientId) {
    return new Response("Thiếu dữ liệu bắt buộc cho request chatbot.", {
      status: 400,
    });
  }

  try {
    const raw = await callAgentEndpoint({
      baseUrl,
      configuredPath,
      defaultPath: agentDefaultPaths.chat,
      body: JSON.stringify({
        schema_version: "v1",
        patient_id: body.patientId,
        conversation_id: body.threadId,
        message: body.message,
        history: body.history ?? [],
      }),
    });

    const payload = {
      ...adaptBackendResponse({
        patientId: body.patientId,
        locale: body.locale,
        question: body.message,
        title: buildThreadTitle(body.message, body.locale),
        raw,
      }),
      threadId: body.threadId,
    };

    const stream = new ReadableStream({
      start(controller) {
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
          send({
            type: "delta",
            text: chunk,
          });
        }

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
  } catch (error) {
    if (error instanceof BackendAgentError) {
      return new Response(error.message, { status: error.status });
    }

    return new Response(
      error instanceof Error ? error.message : "Không thể kết nối backend AI.",
      { status: 502 },
    );
  }
}

function chunkText(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [text];

  const chunks: string[] = [];
  for (let index = 0; index < words.length; index += 6) {
    chunks.push(`${words.slice(index, index + 6).join(" ")} `);
  }

  return chunks;
}
