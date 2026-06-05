import { NextRequest } from "next/server";

import { adaptBackendResponse } from "@/lib/ai/agent-adapter";
import {
  BackendAgentError,
  agentDefaultPaths,
  callAgentEndpoint,
  getAgentBaseUrl,
  getAgentPath,
} from "@/lib/ai/agent-backend";
import type { AgentExplainAlertProxyRequest } from "@/lib/ai/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AgentExplainAlertProxyRequest;
  const baseUrl = getAgentBaseUrl();
  const configuredPath = getAgentPath("explain-alert");

  if (!baseUrl) {
    return Response.json(
      { error: "AI_AGENT_BASE_URL chưa được cấu hình." },
      { status: 500 },
    );
  }

  if (!body.alertId?.trim() || !body.patientId?.trim()) {
    return Response.json(
      { error: "Thiếu alertId hoặc patientId để giải thích cảnh báo." },
      { status: 400 },
    );
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
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Không thể kết nối backend AI.",
      },
      { status: 502 },
    );
  }
}
