import { NextRequest, NextResponse } from "next/server";

import type { PatientVitalsDto } from "@/lib/server/patient-service";
import { getPatientVitalsDto } from "@/lib/server/patient-service";
import { requireClinicalAccess } from "@/lib/server/authz";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ patientId: string }> },
) {
  const { patientId } = await context.params;
  const range = request.nextUrl.searchParams.get("range") ?? "15m";

  try {
    const authz = await requireClinicalAccess();
    if (authz.response) return authz.response;

    const payload = await getPatientVitalsDto(patientId, range);
    if (!payload) {
      return NextResponse.json({
        patient_id: patientId,
        range,
        samples: [],
        metric_summaries: [],
      } satisfies PatientVitalsDto);
    }
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the tai du lieu vital." },
      { status: 500 },
    );
  }
}
