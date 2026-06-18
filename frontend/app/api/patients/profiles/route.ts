import { NextResponse } from "next/server";

import { listPatientProfiles } from "@/lib/server/patient-service";
import { requireClinicalAccess } from "@/lib/server/authz";

export const runtime = "nodejs";

export async function GET() {
  try {
    const authz = await requireClinicalAccess();
    if (authz.response) return authz.response;

    return NextResponse.json(await listPatientProfiles());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the tai danh sach benh nhan." },
      { status: 500 },
    );
  }
}
