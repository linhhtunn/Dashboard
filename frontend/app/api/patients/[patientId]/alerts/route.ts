import { NextResponse } from "next/server";

import { enrichAlertDto } from "@/lib/mock/alert-workflow-store";
import { listMockPatientAlerts } from "@/lib/mock/patient-api";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ patientId: string }> },
) {
  const { patientId } = await context.params;

  try {
    const payload = listMockPatientAlerts(patientId).map(enrichAlertDto);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the tai danh sach canh bao." },
      { status: 500 },
    );
  }
}
