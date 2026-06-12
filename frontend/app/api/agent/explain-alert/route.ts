import { NextRequest } from "next/server";

import { adaptBackendResponse } from "@/lib/ai/agent-adapter";
import {
  BackendAgentError,
  agentDefaultPaths,
  callAgentEndpoint,
  getAgentBaseUrl,
  getAgentPath,
} from "@/lib/ai/agent-backend";
import { buildMockExplainAlertPayload } from "@/lib/ai/mock-chat";
import type { AgentExplainAlertProxyRequest } from "@/lib/ai/types";
import { getAlertById } from "@/lib/server/clinical-store";
import { getMetricLabel } from "@/lib/i18n";

export const runtime = "nodejs";

function buildMockFromAlert(body: AgentExplainAlertProxyRequest) {
  const alert = getAlertById(body.alertId);
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
  const baseUrl = getAgentBaseUrl();
  const configuredPath = getAgentPath("explain-alert");

  if (!body.alertId?.trim() || !body.patientId?.trim()) {
    return Response.json(
      { error: "Thiếu alertId hoặc patientId để giải thích cảnh báo." },
      { status: 400 },
    );
  }

  if (!baseUrl) {
    return Response.json(buildMockFromAlert(body));
  }

  try {
    const raw = await callAgentEndpoint({
      baseUrl,
      configuredPath,
      defaultPath: agentDefaultPaths.explainAlert,
      body: JSON.stringify({
        alert_id: body.alertId,
      }),
    });

    const payload = adaptBackendResponse({
      patientId: body.patientId,
      locale: body.locale,
      question:
        body.locale === "vi"
          ? `Giải thích cảnh báo ${body.alertId}`
          : `Explain alert ${body.alertId}`,
      title:
        body.locale === "vi" ? "Giải thích cảnh báo" : "Alert explanation",
      raw,
    });

    return Response.json(payload);
  } catch (error) {
    if (error instanceof BackendAgentError) {
      return Response.json(buildMockFromAlert(body));
    }

    return Response.json(buildMockFromAlert(body));
  }
}
