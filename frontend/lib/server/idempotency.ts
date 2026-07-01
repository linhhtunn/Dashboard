import { createHash } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canIgnoreWorkflowStorageError } from "@/lib/supabase/errors";

export type IdempotencyReplay = { status: number; body: Record<string, unknown> };

function hashRequest(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

export async function beginIdempotentRequest(input: {
  actorUserId: string;
  key: string | null;
  body: unknown;
}): Promise<{ requestHash: string; replay: IdempotencyReplay | null }> {
  const key = input.key?.trim();
  if (!key || key.length < 8 || key.length > 200) {
    throw new Error("Idempotency-Key must contain 8 to 200 characters.");
  }

  const requestHash = hashRequest(input.body);
  const admin = createSupabaseAdminClient();
  if (!admin) return { requestHash, replay: null };

  const { data, error } = await admin
    .from("idempotency_keys")
    .select("request_hash,response_status,response_body,expires_at")
    .eq("actor_user_id", input.actorUserId)
    .eq("idempotency_key", key)
    .maybeSingle();
  if (error) {
    if (canIgnoreWorkflowStorageError(error)) return { requestHash, replay: null };
    throw new Error(error.message);
  }
  if (data) {
    if (new Date(data.expires_at).getTime() <= Date.now()) {
      const { error: deleteError } = await admin
        .from("idempotency_keys")
        .delete()
        .eq("actor_user_id", input.actorUserId)
        .eq("idempotency_key", key);
      if (deleteError) throw new Error(deleteError.message);
    } else {
      if (data.request_hash !== requestHash) {
        throw new Error("Idempotency-Key was already used for a different request.");
      }
      if (data.response_status && data.response_body) {
        return {
          requestHash,
          replay: { status: data.response_status, body: data.response_body },
        };
      }
      throw new Error("An identical request is already in progress.");
    }
  }

  const { error: insertError } = await admin.from("idempotency_keys").insert({
    actor_user_id: input.actorUserId,
    idempotency_key: key,
    request_hash: requestHash,
  });
  if (insertError && !canIgnoreWorkflowStorageError(insertError)) {
    throw new Error(insertError.message);
  }
  return { requestHash, replay: null };
}

export async function completeIdempotentRequest(input: {
  actorUserId: string;
  key: string;
  requestHash: string;
  status: number;
  body: Record<string, unknown>;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  const { error } = await admin
    .from("idempotency_keys")
    .update({ response_status: input.status, response_body: input.body })
    .eq("actor_user_id", input.actorUserId)
    .eq("idempotency_key", input.key)
    .eq("request_hash", input.requestHash);
  if (error && !canIgnoreWorkflowStorageError(error)) throw new Error(error.message);
}
