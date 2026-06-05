import { NextRequest, NextResponse } from "next/server";

import { fetchBackendJson, getBackendBaseUrl, getDataPath } from "@/lib/backend-data";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: "AI_AGENT_BASE_URL chưa được cấu hình." }, { status: 500 });
  }

  try {
    const payload = await fetchBackendJson<unknown>({
      baseUrl,
      path: getDataPath("patients"),
      searchParams: request.nextUrl.searchParams,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải danh sách bệnh nhân." },
      { status: 502 },
    );
  }
}
