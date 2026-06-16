import { NextResponse } from "next/server";

import { enrichAlertDto } from "@/lib/mock/alert-workflow-store";
import { listMockAlerts } from "@/lib/mock/patient-api";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(listMockAlerts().map(enrichAlertDto));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải cảnh báo." },
      { status: 500 },
    );
  }
}
