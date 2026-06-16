import { NextResponse } from "next/server";

import {
  getReportSummary,
  parseReportQuery,
} from "@/lib/server/report-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const summary = getReportSummary(parseReportQuery(searchParams));
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tải tóm tắt báo cáo.",
      },
      { status: 500 },
    );
  }
}
