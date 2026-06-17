import { NextResponse } from "next/server";

import { enrichAlertDto } from "@/lib/mock/alert-workflow-store";
import { listAlerts } from "@/lib/server/patient-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const alerts = await listAlerts();
    const payload = await Promise.all(alerts.map((alert) => enrichAlertDto(alert)));
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải cảnh báo." },
      { status: 500 },
    );
  }
}
