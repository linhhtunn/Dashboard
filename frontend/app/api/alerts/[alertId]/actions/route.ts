import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { isSupabaseAuthConfigured } from "@/lib/auth/config";
import {
  recordAcknowledgement,
  recordDoctorConfirm,
  recordDoctorConfirmNoise,
  recordNoise,
  recordNurseTreatment,
} from "@/lib/mock/alert-workflow-store";
import { normalizePatientId } from "@/lib/patient-id";
import { appendClinicalAuditEvent } from "@/lib/server/clinical-audit";
import { requireRole } from "@/lib/server/authz";
import { getAlertById, getFloorNurses, getOperatorActor } from "@/lib/server/clinical-store";
import {
  assignAlertToDoctor,
  createCompletedEncounter,
  getAlertAssignment,
} from "@/lib/server/encounter-db";
import {
  beginIdempotentRequest,
  completeIdempotentRequest,
} from "@/lib/server/idempotency";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ClinicalPersona, OperatorRole } from "@/types";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ alertId: string }> };
type Actor = { role: OperatorRole; actorId: string; actorName: string };

async function getActor(request: Request): Promise<Actor> {
  const role = (request.headers.get("x-operator-role") ?? "coordinator") as OperatorRole;
  const session = await getOperatorActor(role);
  const encodedName = request.headers.get("x-operator-name");
  let headerName: string | null = null;
  if (encodedName) {
    try {
      headerName = decodeURIComponent(encodedName);
    } catch {
      headerName = encodedName;
    }
  }
  return {
    role,
    actorId: request.headers.get("x-operator-id") ?? session?.actorId ?? role,
    actorName: headerName ?? session?.name ?? role,
  };
}

function correlationIdFrom(request: Request): string {
  const value = request.headers.get("x-correlation-id")?.trim();
  return value && /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value) ? value : randomUUID();
}

export async function POST(request: Request, context: RouteContext) {
  let failureContext: {
    actorUserId: string;
    key: string;
    requestHash: string;
  } | null = null;
  try {
    const { alertId } = await context.params;
    const alert = (await getAlertById(alertId)) ?? null;
    if (!alert) return NextResponse.json({ error: "Alert not found." }, { status: 404 });

    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const doctorAction = action === "doctor_confirm" || action === "doctor_confirm_noise";
    const expectedRole: ClinicalPersona = doctorAction ? "doctor" : "coordinator";
    let actor: Actor;
    if (isSupabaseAuthConfigured()) {
      const authz = await requireRole(expectedRole);
      if (authz.response) return authz.response;
      actor = {
        role: expectedRole,
        actorId: authz.profile!.userId,
        actorName: authz.profile!.displayName ?? authz.profile!.email ?? expectedRole,
      };
    } else {
      actor = await getActor(request);
    }

    const idempotencyKey = request.headers.get("idempotency-key");
    const correlationId = correlationIdFrom(request);
    const idempotency = await beginIdempotentRequest({
      actorUserId: actor.actorId,
      key: idempotencyKey,
      body: { alertId, ...body },
    });
    if (idempotency.replay) {
      return NextResponse.json(idempotency.replay.body, {
        status: idempotency.replay.status,
        headers: { "X-Correlation-ID": correlationId, "Idempotency-Replayed": "true" },
      });
    }
    failureContext = {
      actorUserId: actor.actorId,
      key: idempotencyKey!,
      requestHash: idempotency.requestHash,
    };

    const writeClient = isSupabaseAuthConfigured()
      ? await createSupabaseServerClient()
      : undefined;

    const finish = async (
      state: Record<string, unknown>,
      eventType: string,
      auditPayload: Record<string, unknown> = {},
    ) => {
      await appendClinicalAuditEvent({
        eventType,
        aggregateType: "alert",
        aggregateId: alertId,
        actorUserId: actor.actorId,
        actorRole: expectedRole,
        correlationId,
        idempotencyKey: idempotencyKey!,
        payload: auditPayload,
      });
      await completeIdempotentRequest({
        actorUserId: actor.actorId,
        key: idempotencyKey!,
        requestHash: idempotency.requestHash,
        status: 200,
        body: state,
      });
      failureContext = null;
      return NextResponse.json(state, { headers: { "X-Correlation-ID": correlationId } });
    };

    const reject = async (error: string, status: number) => {
      const responseBody = { error };
      await completeIdempotentRequest({
        actorUserId: actor.actorId,
        key: idempotencyKey!,
        requestHash: idempotency.requestHash,
        status,
        body: responseBody,
      });
      failureContext = null;
      return NextResponse.json(responseBody, { status, headers: { "X-Correlation-ID": correlationId } });
    };

    if (action === "acknowledge") {
      if (actor.role !== "coordinator") {
        return reject("Only the coordinator can acknowledge alerts.", 403);
      }
      const state = await recordAcknowledgement(
        alertId,
        actor.actorId,
        actor.actorName,
        writeClient ?? undefined,
      );
      return finish(state, "alert.acknowledged");
    }

    if (action === "nurse_treat" || action === "needs_follow_up") {
      if (actor.role !== "coordinator") {
        return reject("Only the coordinator can record treatment.", 403);
      }
      if (alert.workflowStatus === "open") {
        await recordAcknowledgement(alertId, actor.actorId, actor.actorName, writeClient ?? undefined);
      }

      const floorNurseId = String(body.floorNurseId ?? "");
      const floorNurse = (await getFloorNurses()).find((member) => member.id === floorNurseId);
      if (!floorNurse) {
        return reject("Select a floor nurse on shift.", 400);
      }
      const symptomsBefore = String(body.symptomsBefore ?? "").trim();
      const actionTaken = String(body.actionTaken ?? "").trim();
      const symptomsAfter = String(body.symptomsAfter ?? "").trim();
      if (!symptomsBefore || !actionTaken || !symptomsAfter) {
        return reject("symptomsBefore, actionTaken, and symptomsAfter are required.", 400);
      }

      const outcome = action === "needs_follow_up" || body.outcome === "needs_follow_up"
        ? "needs_follow_up" as const
        : "completed" as const;
      const doctorUserId = String(body.doctorUserId ?? "").trim();
      if (isSupabaseAuthConfigured() && !doctorUserId) {
        return reject("doctorUserId is required.", 400);
      }
      if (doctorUserId) {
        await assignAlertToDoctor({
          alertId,
          patientId: normalizePatientId(alert.patientId),
          doctorUserId,
          assignedByUserId: actor.actorId,
        });
      }

      const state = await recordNurseTreatment(
        alertId,
        normalizePatientId(alert.patientId),
        {
          symptomsBefore,
          actionTaken,
          symptomsAfter,
          outcome,
          floorNurseId: floorNurse.id,
          floorNurseName: floorNurse.name,
          zoneCode: String(body.zone_code ?? body.zoneCode ?? floorNurse.zoneCode).trim(),
          followUpNote: outcome === "needs_follow_up"
            ? String(body.followUpNote ?? "").trim() || undefined
            : undefined,
          actorId: actor.actorId,
          actorName: actor.actorName,
        },
        writeClient ?? undefined,
      );
      return finish(state, `alert.${action}`, { doctorUserId, floorNurseId });
    }

    if (action === "mark_noise") {
      if (actor.role !== "coordinator") {
        return reject("Only the coordinator can mark noise.", 403);
      }
      if (alert.workflowStatus === "open") {
        await recordAcknowledgement(alertId, actor.actorId, actor.actorName, writeClient ?? undefined);
      }
      const description = String(body.description ?? "").trim();
      if (!description) {
        return reject("description is required for noise alerts.", 400);
      }
      const doctorUserId = String(body.doctorUserId ?? "").trim();
      if (alert.severity === "critical" && !doctorUserId) {
        return reject("Critical suspected noise must be assigned to a doctor.", 400);
      }
      if (doctorUserId) {
        await assignAlertToDoctor({
          alertId,
          patientId: normalizePatientId(alert.patientId),
          doctorUserId,
          assignedByUserId: actor.actorId,
        });
      }
      const state = await recordNoise(
        alertId,
        alert.severity,
        description,
        actor.actorId,
        actor.actorName,
        writeClient ?? undefined,
      );
      return finish(state, "alert.noise_marked", {
        severity: alert.severity,
        doctorReviewRequired: alert.severity === "critical",
      });
    }

    if (doctorAction) {
      if (actor.role !== "doctor") {
        return reject("Only a doctor can confirm alerts.", 403);
      }
      const conclusion = String(body.conclusion ?? "").trim();
      if (!conclusion) {
        return reject("conclusion is required.", 400);
      }
      if (isSupabaseAuthConfigured()) {
        const assignment = await getAlertAssignment(alertId);
        if (!assignment || assignment.doctor_user_id !== actor.actorId) {
          return reject("This alert is assigned to another doctor.", 403);
        }
      }

      if (action === "doctor_confirm_noise") {
        const state = await recordDoctorConfirmNoise(
          alertId,
          conclusion,
          actor.actorId,
          actor.actorName,
          writeClient ?? undefined,
        );
        return finish(state, "alert.noise_confirmed");
      }

      const symptoms = String(body.symptoms ?? "").trim();
      const clinicalNotes = String(body.clinicalNotes ?? "").trim();
      const startedAt = String(body.startedAt ?? "").trim();
      if (isSupabaseAuthConfigured() && (!symptoms || !clinicalNotes || !startedAt)) {
        return reject("symptoms, clinicalNotes, and startedAt are required.", 400);
      }
      const state = await recordDoctorConfirm(
        alertId,
        conclusion,
        actor.actorId,
        actor.actorName,
        writeClient ?? undefined,
      );
      if (isSupabaseAuthConfigured()) {
        await createCompletedEncounter({
          patientId: normalizePatientId(alert.patientId),
          alertId,
          doctorUserId: actor.actorId,
          startedAt,
          symptoms,
          clinicalNotes,
          conclusion,
        });
      }
      return finish(state, "alert.doctor_confirmed");
    }

    return reject("Unknown action.", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record action.";
    const status = message.includes("Idempotency-Key")
      ? message.includes("different") || message.includes("progress") ? 409 : 400
      : message.includes("not allowed") ? 409 : 500;
    if (failureContext) {
      await completeIdempotentRequest({
        actorUserId: failureContext.actorUserId,
        key: failureContext.key,
        requestHash: failureContext.requestHash,
        status,
        body: { error: message },
      }).catch(() => undefined);
    }
    return NextResponse.json({ error: message }, { status });
  }
}
