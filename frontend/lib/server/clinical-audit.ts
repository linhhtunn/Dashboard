import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ClinicalPersona } from "@/types";

export async function appendClinicalAuditEvent(input: {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  actorUserId: string;
  actorRole: ClinicalPersona;
  correlationId: string;
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  const { error } = await admin.from("clinical_audit_events").insert({
    event_type: input.eventType,
    aggregate_type: input.aggregateType,
    aggregate_id: input.aggregateId,
    actor_user_id: input.actorUserId,
    actor_role: input.actorRole,
    correlation_id: input.correlationId,
    idempotency_key: input.idempotencyKey ?? null,
    payload: input.payload ?? {},
  });
  if (error) throw new Error(error.message);
}
