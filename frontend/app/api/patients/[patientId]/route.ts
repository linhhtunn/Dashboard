import { NextResponse } from "next/server";

import { fetchBackendJson, getBackendBaseUrl, getDataPath } from "@/lib/backend-data";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ patientId: string }> },
) {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: "AI_AGENT_BASE_URL chưa được cấu hình." }, { status: 500 });
  }

  const { patientId } = await context.params;

  try {
    const payload = await fetchBackendJson<unknown>({
      baseUrl,
      path: `${getDataPath("patients")}/${patientId}`,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải hồ sơ bệnh nhân." },
      { status: 502 },
    );
  }
}
