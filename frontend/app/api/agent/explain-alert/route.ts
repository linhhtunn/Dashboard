import { NextRequest } from "next/server";

import { adaptBackendResponse } from "@/lib/ai/agent-adapter";
import {
  appendAgentDbContextToMessage,
  buildAgentDbContext,
  withAgentDbMetadata,
} from "@/lib/ai/agent-db-context";
import {
  buildExplainAlertPrompt,
  resolveAgentPatientId,
} from "@/lib/ai/agent-chat-request";
import { isAgentBackendConfigured } from "@/lib/ai/agent-backend";
import { BackendAgentError, invokeAgentChat } from "@/lib/ai/invoke-agent-chat";
import { buildMockExplainAlertPayload } from "@/lib/ai/mock-chat";
import type { AgentExplainAlertProxyRequest } from "@/lib/ai/types";
import { getAlertById } from "@/lib/server/clinical-store";
import { getMetricLabel } from "@/lib/i18n";

export const runtime = "nodejs";

async function buildMockFromAlert(body: AgentExplainAlertProxyRequest) {
  const alert = await getAlertById(body.alertId);
  const evidence = alert?.evidence.find((item) => item.value !== undefined);

  return buildMockExplainAlertPayload({
    locale: body.locale,
    alertId: body.alertId,
    patientId: body.patientId,
    alertType: alert?.type,
    severity: alert?.severity,
    metricLabel: evidence?.metric
      ? getMetricLabel(evidence.metric, body.locale)
      : undefined,
    metricValue: evidence?.value,
    metricUnit: evidence?.unit,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AgentExplainAlertProxyRequest;
  const patientId = resolveAgentPatientId(body.patientId ?? "");

  if (!body.alertId?.trim() || !patientId) {
    return Response.json(
      { error: "Thiếu alertId hoặc patientId để giải thích cảnh báo." },
      { status: 400 },
    );
  }

  const message = buildExplainAlertPrompt(body.locale);
  const title =
    body.locale === "vi" ? "Giải thích cảnh báo" : "Alert explanation";

  const dbContext = await buildAgentDbContext(patientId);
  const agentMessage = appendAgentDbContextToMessage(
    message,
    dbContext,
    body.locale,
  );
  const agentMetadata = withAgentDbMetadata(
    { alert_id: body.alertId, source_view: "alert_detail" },
    dbContext,
  );

  if (!isAgentBackendConfigured()) {
    return Response.json(await buildMockFromAlert(body));
  }

  try {
    const raw = await invokeAgentChat({
      patientId,
      conversationId: `alert-${body.alertId}`,
      message: agentMessage,
      metadata: agentMetadata,
      authorization: request.headers.get("authorization"),
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
