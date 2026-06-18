import { NextResponse } from "next/server";

import {
  getReportPatientRisk,
  parseReportQuery,
} from "@/lib/server/report-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    return NextResponse.json(await getReportPatientRisk(parseReportQuery(searchParams)));
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
