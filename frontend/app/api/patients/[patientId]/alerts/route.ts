import { NextResponse } from "next/server";

import { enrichAlertDto } from "@/lib/mock/alert-workflow-store";
import { listPatientAlerts } from "@/lib/server/patient-service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ patientId: string }> },
) {
  const { patientId } = await context.params;

  try {
    const alerts = await listPatientAlerts(patientId);
    const payload = await Promise.all(alerts.map((alert) => enrichAlertDto(alert)));
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the tai danh sach canh bao." },
      { status: 500 },
    );
  }
}
