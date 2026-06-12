import { NextResponse } from "next/server";

import { listMockAlerts } from "@/lib/mock/patient-api";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(listMockAlerts());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải cảnh báo." },
      { status: 500 },
    );
  }
}
