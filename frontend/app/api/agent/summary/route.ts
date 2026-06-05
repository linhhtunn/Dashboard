import { NextRequest } from "next/server";

import { adaptBackendResponse } from "@/lib/ai/agent-adapter";
import {
  BackendAgentError,
  agentDefaultPaths,
  callAgentEndpoint,
  getAgentBaseUrl,
  getAgentPath,
} from "@/lib/ai/agent-backend";
import type { AgentSummaryProxyRequest } from "@/lib/ai/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AgentSummaryProxyRequest;
  const baseUrl = getAgentBaseUrl();
  const configuredPath = getAgentPath("summary");

  if (!baseUrl) {
    return Response.json(
      { error: "AI_AGENT_BASE_URL chưa được cấu hình." },
      { status: 500 },
    );
  }

  if (!body.patientId?.trim()) {
    return Response.json(
      { error: "Thiếu patientId để tạo tóm tắt." },
      { status: 400 },
    );
  }

  try {
    const raw = await callAgentEndpoint({
      baseUrl,
      configuredPath,
      defaultPath: agentDefaultPaths.summary,
      body: JSON.stringify({
        patient_id: body.patientId,
      }),
    });

    const payload = adaptBackendResponse({
      patientId: body.patientId,
      locale: body.locale,
      question: body.locale === "vi" ? "Tóm tắt tình trạng bệnh nhân" : "Summarize patient status",
      title: body.locale === "vi" ? "Tóm tắt bệnh nhân" : "Patient summary",
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
