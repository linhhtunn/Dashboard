import { NextRequest, NextResponse } from "next/server";

import {
  getReportAlertByType,
  parseReportRange,
} from "@/lib/server/report-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = parseReportRange(searchParams.get("range"));
    const department = searchParams.get("department");

    return NextResponse.json(
      getReportAlertByType({ range, department }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tải phân bố cảnh báo.",
      },
      { status: 500 },
    );
  }
}
