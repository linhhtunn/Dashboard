import { NextResponse } from "next/server";

import { fetchBackendJson, getBackendBaseUrl, getDataPath } from "@/lib/backend-data";

export const runtime = "nodejs";

export async function GET() {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: "AI_AGENT_BASE_URL chưa được cấu hình." }, { status: 500 });
  }

  try {
    const payload = await fetchBackendJson<unknown>({
      baseUrl,
      path: getDataPath("alerts"),
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải cảnh báo." },
      { status: 502 },
    );
  }
}
