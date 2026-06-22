import { NextResponse } from "next/server";

import { getDailyDoctorReport } from "@/lib/server/report-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctor_id")?.trim() || undefined;
    return NextResponse.json(await getDailyDoctorReport(doctorId));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tải báo cáo hàng ngày.",
      },
      { status: 500 },
    );
  }
}
