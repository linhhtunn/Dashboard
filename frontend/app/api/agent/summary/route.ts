import { NextRequest } from "next/server";

import { adaptBackendResponse } from "@/lib/ai/agent-adapter";
import {
  buildSummaryPrompt,
  resolveAgentPatientId,
} from "@/lib/ai/agent-chat-request";
import { isAgentBackendConfigured } from "@/lib/ai/agent-backend";
import { BackendAgentError, invokeAgentChat } from "@/lib/ai/invoke-agent-chat";
import { buildMockChatPayload } from "@/lib/ai/mock-chat";
import type { AgentSummaryProxyRequest } from "@/lib/ai/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AgentSummaryProxyRequest;
  const patientId = resolveAgentPatientId(body.patientId ?? "");

  if (!patientId) {
    return Response.json(
      { error: "Thiếu patientId để tạo tóm tắt." },
      { status: 400 },
    );
  }

  const message = buildSummaryPrompt(body.locale);
  const title =
    body.locale === "vi" ? "Tóm tắt bệnh nhân" : "Patient summary";

  if (!isAgentBackendConfigured()) {
    const mock = buildMockChatPayload({
      locale: body.locale,
      message,
      patientId,
      patientContext: null,
      threadId: `summary-${patientId}`,
      title,
    });
    return Response.json(mock);
  }

  try {
    const raw = await invokeAgentChat({
      patientId,
      conversationId: `summary-${patientId}-${Date.now()}`,
      message,
    });

    const payload = adaptBackendResponse({
      patientId,
      locale: body.locale,
      question: message,
      title,
      raw,
    });

    return Response.json(payload);
  } catch (error) {
    if (error instanceof BackendAgentError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể kết nối backend AI.",
      },
      { status: 502 },
    );
  }
}
