import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { appendClinicalAuditEvent } from "@/lib/server/clinical-audit";
import { requireAdminProfile } from "@/lib/server/authz";
import { beginIdempotentRequest, completeIdempotentRequest } from "@/lib/server/idempotency";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authz = await requireAdminProfile();
  if (authz.response) return authz.response;
  const profile = authz.profile!;
  const body = (await request.json()) as { reason?: string };
  const reason = body.reason?.trim() ?? "";
  if (reason.length < 10) {
    return NextResponse.json(
      { error: "Break-glass reason must contain at least 10 characters." },
      { status: 400 },
    );
  }

  try {
    const key = request.headers.get("idempotency-key");
    const correlationId = request.headers.get("x-correlation-id") ?? randomUUID();
    const idempotency = await beginIdempotentRequest({
      actorUserId: profile.userId,
      key,
      body,
    });
    if (idempotency.replay) {
      return NextResponse.json(idempotency.replay.body, { status: idempotency.replay.status });
    }

    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error("Supabase service role is not configured.");
    const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
    const { data, error } = await admin
      .from("break_glass_grants")
      .insert({ user_id: profile.userId, reason, expires_at: expiresAt })
      .select("id,granted_at,expires_at")
      .single();
    if (error) throw new Error(error.message);
    await appendClinicalAuditEvent({
      eventType: "access.break_glass_granted",
      aggregateType: "user",
      aggregateId: profile.userId,
      actorUserId: profile.userId,
      actorRole: "admin",
      correlationId,
      idempotencyKey: key!,
      payload: { reason, expiresAt },
    });
    const responseBody = { grant: data };
    await completeIdempotentRequest({
      actorUserId: profile.userId,
      key: key!,
      requestHash: idempotency.requestHash,
      status: 201,
      body: responseBody,
    });
    return NextResponse.json(responseBody, {
      status: 201,
      headers: { "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Break-glass failed.";
    return NextResponse.json({ error: message }, { status: message.includes("Idempotency") ? 400 : 500 });
  }
}
