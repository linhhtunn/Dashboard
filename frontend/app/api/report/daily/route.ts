import { NextResponse } from "next/server";

import { getDailyDoctorReport } from "@/lib/server/report-service";
import { requireRole } from "@/lib/server/authz";

export const runtime = "nodejs";

export async function GET() {
  const authz = await requireRole("doctor");
  if (authz.response) return authz.response;
  try {
    return NextResponse.json(await getDailyDoctorReport(authz.profile!));
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
