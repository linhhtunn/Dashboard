import { NextRequest, NextResponse } from "next/server";

import { getPatientVitalsDto } from "@/lib/server/patient-service";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ patientId: string }> },
) {
  const { patientId } = await context.params;
  const range = request.nextUrl.searchParams.get("range") ?? "15m";

  try {
    const payload = await getPatientVitalsDto(patientId, range);
    if (!payload) {
      return NextResponse.json({ error: "Vitals not found." }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the tai du lieu vital." },
      { status: 500 },
    );
  }
}
