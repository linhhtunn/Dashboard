import { NextRequest } from "next/server";

import { adaptBackendResponse } from "@/lib/ai/agent-adapter";
import {
  appendAgentDbContextToMessage,
  buildAgentDbContext,
  buildMockPatientContext,
  withAgentDbMetadata,
} from "@/lib/ai/agent-db-context";
import {
  buildSummaryPrompt,
  resolveAgentPatientId,
} from "@/lib/ai/agent-chat-request";
import { isAgentBackendConfigured } from "@/lib/ai/agent-backend";
import { BackendAgentError, invokeAgentChat } from "@/lib/ai/invoke-agent-chat";
import { buildMockChatPayload } from "@/lib/ai/mock-chat";
import type { AgentSummaryProxyRequest } from "@/lib/ai/types";
import { getAiMode, isDemoModeAllowed } from "@/lib/runtime-config";
import { resolveBackendAuthorization } from "@/lib/ai/backend-authorization";

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

  const dbContext = await buildAgentDbContext(patientId);
  const agentMessage = appendAgentDbContextToMessage(
    message,
    dbContext,
    body.locale,
  );
  const agentMetadata = withAgentDbMetadata(
    { source_view: "patient_summary" },
    dbContext,
  );

  if (getAiMode() === "off") {
    return Response.json({ error: "Clinical AI is disabled." }, { status: 503 });
  }

  if (!isAgentBackendConfigured()) {
    if (!isDemoModeAllowed()) {
      return Response.json({ error: "Clinical AI backend is unavailable." }, { status: 503 });
    }
    const mock = buildMockChatPayload({
      locale: body.locale,
      message,
      patientId,
      patientContext: buildMockPatientContext(dbContext, body.locale),
      threadId: `summary-${patientId}`,
      title,
    });
    return Response.json(mock);
  }

  try {
    const raw = await invokeAgentChat({
      patientId,
      conversationId: `summary-${patientId}-${Date.now()}`,
      message: agentMessage,
      metadata: agentMetadata,
      authorization: await resolveBackendAuthorization(request),
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
