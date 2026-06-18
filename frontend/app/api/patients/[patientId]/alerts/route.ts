import { NextResponse } from "next/server";

import { listPatientAlerts } from "@/lib/server/patient-service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ patientId: string }> },
) {
  const { patientId } = await context.params;

  try {
    return NextResponse.json(await listPatientAlerts(patientId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the tai danh sach canh bao." },
      { status: 500 },
    );
  }
}
