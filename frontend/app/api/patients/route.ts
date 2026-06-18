import { NextRequest, NextResponse } from "next/server";

import { listPatientItems } from "@/lib/server/patient-service";
import { requireClinicalAccess } from "@/lib/server/authz";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const authz = await requireClinicalAccess();
    if (authz.response) return authz.response;

    const payload = await listPatientItems({
      query: request.nextUrl.searchParams.get("query"),
      status: request.nextUrl.searchParams.get("status"),
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the tai danh sach benh nhan." },
      { status: 500 },
    );
  }
}
