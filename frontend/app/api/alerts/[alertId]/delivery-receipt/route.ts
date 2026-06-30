import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { appendClinicalAuditEvent } from "@/lib/server/clinical-audit";
import { requireAuthenticatedProfile } from "@/lib/server/authz";
import { beginIdempotentRequest, completeIdempotentRequest } from "@/lib/server/idempotency";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ alertId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const authz = await requireAuthenticatedProfile();
  if (authz.response) return authz.response;
  const profile = authz.profile!;
  if (profile.roleCode === "admin") {
    return NextResponse.json({ error: "Admin accounts cannot receive clinical alerts." }, { status: 403 });
  }
  const { alertId } = await context.params;
  const key = request.headers.get("idempotency-key");
  const correlationId = request.headers.get("x-correlation-id") ?? randomUUID();
  try {
    const idempotency = await beginIdempotentRequest({
      actorUserId: profile.userId,
      key,
      body: { alertId, action: "ui_delivery_receipt" },
    });
    if (idempotency.replay) return NextResponse.json(idempotency.replay.body);
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error("Supabase service role is not configured.");
    const deliveredAt = new Date().toISOString();
    const { error } = await admin.from("alert_deliveries").upsert(
      {
        event_id: randomUUID(),
        alert_id: alertId,
        recipient: profile.userId,
        channel: "ui",
        attempts: 1,
        delivered_at: deliveredAt,
      },
      { onConflict: "alert_id,recipient,channel", ignoreDuplicates: true },
    );
    if (error) throw new Error(error.message);
    await appendClinicalAuditEvent({
      eventType: "alert.ui_delivered",
      aggregateType: "alert",
      aggregateId: alertId,
      actorUserId: profile.userId,
      actorRole: profile.roleCode,
      correlationId,
      idempotencyKey: key!,
      payload: { deliveredAt },
    });
    const responseBody = { ok: true, deliveredAt };
    await completeIdempotentRequest({
      actorUserId: profile.userId,
      key: key!,
      requestHash: idempotency.requestHash,
      status: 200,
      body: responseBody,
    });
    return NextResponse.json(responseBody, { headers: { "X-Correlation-ID": correlationId } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to record delivery." },
      { status: 500 },
    );
  }
}
