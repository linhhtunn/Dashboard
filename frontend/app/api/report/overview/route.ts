import { NextResponse } from "next/server";

import {
  getReportOverview,
  parseReportQuery,
} from "@/lib/server/report-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    return NextResponse.json(await getReportOverview(parseReportQuery(searchParams)));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tải tổng quan báo cáo.",
      },
      { status: 500 },
    );
  }
}
