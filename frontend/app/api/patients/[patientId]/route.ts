import { NextResponse } from "next/server";

import { getPatientDtoById } from "@/lib/server/patient-service";
import { requireClinicalAccess } from "@/lib/server/authz";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ patientId: string }> },
) {
  const { patientId } = await context.params;

  try {
    const authz = await requireClinicalAccess();
    if (authz.response) return authz.response;

    const payload = await getPatientDtoById(patientId);
    if (!payload) {
      return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the tai ho so benh nhan." },
      { status: 500 },
    );
  }
}
