import { NextResponse } from "next/server";

import { listAlerts } from "@/lib/server/patient-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await listAlerts());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải cảnh báo." },
      { status: 500 },
    );
  }
}
