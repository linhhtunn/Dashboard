import { NextRequest, NextResponse } from "next/server";

import { listPatientAlerts } from "@/lib/server/patient-service";

export const runtime = "nodejs";
const DEFAULT_ALERT_LIMIT = 50;
const MAX_ALERT_LIMIT = 200;

function parseAlertLimit(value: string | null) {
  const parsed = Number.parseInt(value ?? String(DEFAULT_ALERT_LIMIT), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_ALERT_LIMIT;
  return Math.min(parsed, MAX_ALERT_LIMIT);
}

function parseAlertOffset(value: string | null) {
  const parsed = Number.parseInt(value ?? "0", 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ patientId: string }> },
) {
  const { patientId } = await context.params;

  try {
    return NextResponse.json(
      await listPatientAlerts(patientId, {
        limit: parseAlertLimit(request.nextUrl.searchParams.get("limit")),
        offset: parseAlertOffset(request.nextUrl.searchParams.get("offset")),
      }),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Khong the tai danh sach canh bao." },
      { status: 500 },
    );
  }
}
