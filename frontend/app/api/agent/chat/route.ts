import { NextRequest } from "next/server";

import { adaptBackendResponse, buildThreadTitle } from "@/lib/ai/agent-adapter";
import {
  buildMockChatPayload,
  shouldUseMockChatResponse,
} from "@/lib/ai/mock-chat";
import {
  BackendAgentError,
  agentDefaultPaths,
  callAgentEndpoint,
  getAgentBaseUrl,
  getAgentPath,
} from "@/lib/ai/agent-backend";
import type {
  AgentChatProxyPayload,
  AgentChatProxyRequest,
  AgentChatStreamEvent,
} from "@/lib/ai/types";
import { fetchBackendJson, getDataPath } from "@/lib/backend-data";
import { normalizePatientId } from "@/lib/patient-id";
import type { AlertSeverity, Gender } from "@/types";

export const runtime = "nodejs";

type PatientDto = {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  ward_label?: { vi: string; en: string };
  bed?: string | null;
};

type VitalDto = {
  heart_rate: number;
  respiratory_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  spo2: number;
};

type PatientVitalsDto = {
  samples: VitalDto[];
};

type AlertDto = {
  type: string;
  severity: AlertSeverity;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AgentChatProxyRequest;
  const baseUrl = getAgentBaseUrl();
  const configuredPath = getAgentPath("chat");
  const normalizedPatientId = normalizePatientId(body.patientId ?? "");

  if (!body.message?.trim() || !body.threadId || !normalizedPatientId) {
    return new Response("Thiếu dữ liệu bắt buộc cho request chatbot.", {
      status: 400,
    });
  }

  const title = buildThreadTitle(body.message, body.locale);
  const patientContext = await loadPatientContext(baseUrl, normalizedPatientId);

  if (shouldUseMockChatResponse(body.message, baseUrl)) {
    const payload = buildMockChatPayload({
      locale: body.locale,
      message: body.message,
      patientId: normalizedPatientId,
      patientContext,
      threadId: body.threadId,
      title,
    });
    return createStreamResponse(payload, { typingDelayMs: 90 });
  }

  try {
    const raw = await callAgentEndpoint({
      baseUrl: baseUrl!,
      configuredPath,
      defaultPath: agentDefaultPaths.chat,
      body: JSON.stringify({
        schema_version: "v1",
        patient_id: normalizedPatientId,
        conversation_id: body.threadId,
        doctor_id: body.userId,
        message: body.message,
        history: body.history ?? [],
      }),
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

    const fallbackPayload = buildMockChatPayload({
      locale: body.locale,
      message: body.message,
      patientId: normalizedPatientId,
      patientContext,
      threadId: body.threadId,
      title,
    });
    return createStreamResponse(fallbackPayload, { typingDelayMs: 90 });
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

async function loadPatientContext(baseUrl: string | undefined, patientId: string) {
  if (!baseUrl) return null;

  try {
    const [patient, vitals, alerts] = await Promise.all([
      fetchBackendJson<PatientDto>({
        baseUrl,
        path: `${getDataPath("patients")}/${patientId}`,
      }),
      fetchBackendJson<PatientVitalsDto>({
        baseUrl,
        path: `${getDataPath("patients")}/${patientId}/vitals`,
      }).catch(() => null),
      fetchBackendJson<AlertDto[]>({
        baseUrl,
        path: `${getDataPath("patients")}/${patientId}/alerts`,
      }).catch(() => []),
    ]);

    const latestVitals = vitals?.samples?.[0];

    return {
      id: patient.id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      wardLabel: patient.ward_label?.vi ?? patient.ward_label?.en,
      bed: patient.bed ?? undefined,
      latestVitals: latestVitals
        ? {
            heartRate: latestVitals.heart_rate,
            respiratoryRate: latestVitals.respiratory_rate,
            systolicBp: latestVitals.systolic_bp,
            diastolicBp: latestVitals.diastolic_bp,
            spo2: latestVitals.spo2,
          }
        : undefined,
      alerts: alerts.slice(0, 3),
    };
  } catch {
    return null;
  }
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
