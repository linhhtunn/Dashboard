import { NextRequest, NextResponse } from "next/server";

import { listAlerts } from "@/lib/server/patient-service";
import { requireClinicalAccess } from "@/lib/server/authz";
import { getAlertAssignments } from "@/lib/server/encounter-db";

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

export async function GET(request: NextRequest) {
  const authz = await requireClinicalAccess();
  if (authz.response) return authz.response;
  try {
    const alerts = await listAlerts({
        patientId: request.nextUrl.searchParams.get("patientId"),
        limit: parseAlertLimit(request.nextUrl.searchParams.get("limit")),
        offset: parseAlertOffset(request.nextUrl.searchParams.get("offset")),
      });
    if (!authz.profile) return NextResponse.json(alerts);
    const assignments = await getAlertAssignments(alerts.map((alert) => alert.id));
    const visible = alerts
      .map((alert) => ({
        ...alert,
        assigned_doctor_user_id: assignments.get(alert.id)?.doctor_user_id ?? null,
      }))
      .filter((alert) =>
        authz.profile!.roleCode !== "doctor" ||
        alert.assigned_doctor_user_id === authz.profile!.userId,
      );
    return NextResponse.json(visible);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải cảnh báo." },
      { status: 500 },
    );
  }
}
