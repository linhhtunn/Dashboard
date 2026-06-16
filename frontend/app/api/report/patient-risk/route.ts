import { NextRequest, NextResponse } from "next/server";

import {
  getReportPatientRisk,
  parseReportRange,
} from "@/lib/server/report-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = parseReportRange(searchParams.get("range"));
    const department = searchParams.get("department");
    const sort = searchParams.get("sort") ?? "critical_desc";
    const page = Number(searchParams.get("page") ?? "1");
    const filterDate = searchParams.get("date");

    return NextResponse.json(
      getReportPatientRisk({
        range,
        department,
        sort,
        page: Number.isFinite(page) ? page : 1,
        filterDate,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tải bảng rủi ro bệnh nhân.",
      },
      { status: 500 },
    );
  }
}
