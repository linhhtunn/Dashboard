import { createHmac, randomUUID } from "node:crypto";

import { getAlertDispatchMode, isPhiProcessingApproved } from "@/lib/runtime-config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type EscalationResult = { scanned: number; escalated: number; shadowed: number; failed: number };

function patientToken(patientId: string, secret: string): string {
  return createHmac("sha256", secret).update(patientId).digest("hex").slice(0, 32);
}

export function signHospitalWebhook(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export async function markAlertDeliveryAcknowledged(
  alertId: string,
  acknowledgedAt: string,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  const { error } = await admin
    .from("alert_deliveries")
    .update({ acknowledged_at: acknowledgedAt })
    .eq("alert_id", alertId)
    .is("acknowledged_at", null);
  if (error) throw new Error(error.message);
}

export async function escalateOverdueCriticalAlerts(now = new Date()): Promise<EscalationResult> {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Supabase service role is required for alert dispatch.");
  const webhookUrl = process.env.HOSPITAL_ALERT_WEBHOOK_URL?.trim();
  const webhookSecret = process.env.HOSPITAL_ALERT_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) throw new Error("HOSPITAL_ALERT_WEBHOOK_SECRET is required.");

  const ackDeadline = new Date(now.getTime() - 60_000).toISOString();
  const { data: alerts, error } = await admin
    .from("portal_alerts")
    .select("id,patient_id,severity,timestamp,acknowledged")
    .eq("severity", "critical")
    .lte("timestamp", ackDeadline)
    .limit(500);
  if (error) throw new Error(error.message);

  const result: EscalationResult = { scanned: alerts?.length ?? 0, escalated: 0, shadowed: 0, failed: 0 };
  for (const alert of alerts ?? []) {
    const { data: assignment } = await admin
      .from("portal_alert_assignments")
      .select("alert_id")
      .eq("alert_id", alert.id)
      .maybeSingle();
    const ageMs = now.getTime() - new Date(alert.timestamp).getTime();
    const escalationReason = !alert.acknowledged
      ? "ack_overdue"
      : !assignment && ageMs >= 5 * 60_000
        ? "assignment_overdue"
        : null;
    if (!escalationReason) continue;
    const { data: existingDelivery } = await admin
      .from("alert_deliveries")
      .select("attempts,delivered_at")
      .eq("alert_id", alert.id)
      .eq("recipient", "hospital-escalation")
      .eq("channel", "hospital_webhook")
      .maybeSingle();
    if (existingDelivery?.delivered_at) continue;
    const { data: patient } = await admin
      .from("portal_patients")
      .select("department_code")
      .eq("id", alert.patient_id)
      .maybeSingle();
    const payload = {
      patient_token: patientToken(alert.patient_id, webhookSecret),
      severity: "critical",
      escalation_reason: escalationReason,
      department: patient?.department_code ?? "unknown",
      ack_deadline: new Date(new Date(alert.timestamp).getTime() + 60_000).toISOString(),
      deep_link: `${process.env.APP_BASE_URL ?? "https://caresignal.vercel.app"}/alerts?focus=${encodeURIComponent(alert.id)}`,
    };
    const body = JSON.stringify(payload);
    const mode = getAlertDispatchMode();
    const eventId = randomUUID();

    if (mode === "shadow") {
      const { error: ledgerError } = await admin.from("alert_deliveries").upsert(
        {
          event_id: eventId,
          alert_id: alert.id,
          recipient: "hospital-escalation",
          channel: "hospital_webhook",
          escalated_at: now.toISOString(),
          webhook_receipt: "shadow",
        },
        { onConflict: "alert_id,recipient,channel", ignoreDuplicates: true },
      );
      if (ledgerError) throw new Error(ledgerError.message);
      result.shadowed += 1;
      continue;
    }

    if (!isPhiProcessingApproved()) throw new Error("Live dispatch requires PHI approval.");
    if (!webhookUrl) throw new Error("HOSPITAL_ALERT_WEBHOOK_URL is required in live mode.");
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CareSignal-Signature": `sha256=${signHospitalWebhook(body, webhookSecret)}`,
          "X-CareSignal-Event-ID": eventId,
        },
        body,
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error(`Hospital webhook returned ${response.status}.`);
      const receipt = response.headers.get("x-webhook-receipt") ?? response.status.toString();
      const { error: ledgerError } = await admin.from("alert_deliveries").upsert(
        {
          event_id: eventId,
          alert_id: alert.id,
          recipient: "hospital-escalation",
          channel: "hospital_webhook",
          attempts: (existingDelivery?.attempts ?? 0) + 1,
          delivered_at: now.toISOString(),
          escalated_at: now.toISOString(),
          webhook_receipt: receipt,
          last_error: null,
        },
        { onConflict: "alert_id,recipient,channel" },
      );
      if (ledgerError) throw new Error(ledgerError.message);
      result.escalated += 1;
    } catch (deliveryError) {
      await admin.from("alert_deliveries").upsert(
        {
          event_id: eventId,
          alert_id: alert.id,
          recipient: "hospital-escalation",
          channel: "hospital_webhook",
          attempts: (existingDelivery?.attempts ?? 0) + 1,
          escalated_at: now.toISOString(),
          last_error: deliveryError instanceof Error ? deliveryError.message : "unknown error",
        },
        { onConflict: "alert_id,recipient,channel" },
      );
      result.failed += 1;
    }
  }
  return result;
}
