import { NextResponse } from "next/server";

import { listPendingDoctorConfirmations } from "@/lib/mock/alert-workflow-store";
import { getClinicalSummary } from "@/lib/server/clinical-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const summary = getClinicalSummary();
    const pendingDoctorCount = listPendingDoctorConfirmations().length;

    return NextResponse.json({
      ...summary,
      pending_doctor_confirm_count: pendingDoctorCount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tải tóm tắt lâm sàng.",
      },
      { status: 500 },
    );
  }
}
