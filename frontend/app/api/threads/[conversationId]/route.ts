import { NextResponse } from "next/server";

import { fetchBackendJson, getBackendBaseUrl, getDataPath } from "@/lib/backend-data";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: "AI_AGENT_BASE_URL chưa được cấu hình." }, { status: 500 });
  }

  const { conversationId } = await context.params;

  try {
    const payload = await fetchBackendJson<unknown>({
      baseUrl,
      path: `${getDataPath("threads")}/${conversationId}`,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải chi tiết đoạn chat." },
      { status: 502 },
    );
  }
}
