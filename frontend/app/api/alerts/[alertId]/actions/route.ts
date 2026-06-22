import { NextResponse } from "next/server";

import {
  recordDoctorConfirm,
  recordNoise,
  recordNurseTreatment,
} from "@/lib/mock/alert-workflow-store";
import { getAlertById, getFloorNurses, getOperatorActor } from "@/lib/server/clinical-store";
import { normalizePatientId } from "@/lib/patient-id";
import { isSupabaseAuthConfigured } from "@/lib/auth/config";
import { requireRole } from "@/lib/server/authz";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  assignAlertToDoctor,
  createCompletedEncounter,
  getAlertAssignment,
} from "@/lib/server/encounter-db";
import type { OperatorRole } from "@/types";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ alertId: string }> };

async function findAlert(alertId: string) {
  return (await getAlertById(alertId)) ?? null;
}

async function getActor(request: Request) {
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

export async function POST(request: Request, context: RouteContext) {
  try {
    const { alertId } = await context.params;
    const alert = await findAlert(alertId);
    if (!alert) {
      return NextResponse.json({ error: "Alert not found." }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const action = body.action as string;
    const expectedRole = action === "doctor_confirm" ? "doctor" : "coordinator";
    let actor: Awaited<ReturnType<typeof getActor>>;
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
    const writeClient = isSupabaseAuthConfigured()
      ? await createSupabaseServerClient()
      : undefined;

    if (action === "nurse_treat" || action === "needs_follow_up") {
      if (actor.role !== "coordinator") {
        return NextResponse.json(
          { error: "Only the shift coordinator can record treatment." },
          { status: 403 },
        );
      }

      const floorNurseId = String(body.floorNurseId ?? "");
      const floorNurses = await getFloorNurses();
      const floorNurse = floorNurses.find((member) => member.id === floorNurseId);
      if (!floorNurse) {
        return NextResponse.json(
          { error: "Select a floor nurse on shift." },
          { status: 400 },
        );
      }

      const symptomsBefore = String(body.symptomsBefore ?? "").trim();
      const actionTaken = String(body.actionTaken ?? "").trim();
      const symptomsAfter = String(body.symptomsAfter ?? "").trim();
      const zoneCode = String(
        body.zone_code ?? body.zoneCode ?? floorNurse.zoneCode,
      ).trim();

      if (!symptomsBefore || !actionTaken || !symptomsAfter) {
        return NextResponse.json(
          { error: "symptomsBefore, actionTaken, and symptomsAfter are required." },
          { status: 400 },
        );
      }

      const outcome =
        action === "needs_follow_up"
          ? ("needs_follow_up" as const)
          : (String(body.outcome ?? "completed") as "completed" | "needs_follow_up");

      if (isSupabaseAuthConfigured()) {
        const doctorUserId = String(body.doctorUserId ?? "").trim();
        if (!doctorUserId) {
          return NextResponse.json({ error: "doctorUserId is required." }, { status: 400 });
        }
        await assignAlertToDoctor({
          alertId,
          patientId: normalizePatientId(alert.patientId),
          doctorUserId,
          assignedByUserId: actor.actorId,
        });
      }

      const state = await recordNurseTreatment(alertId, normalizePatientId(alert.patientId), {
        symptomsBefore,
        actionTaken,
        symptomsAfter,
        outcome,
        floorNurseId: floorNurse.id,
        floorNurseName: floorNurse.name,
        zoneCode,
        followUpNote:
          outcome === "needs_follow_up"
            ? String(body.followUpNote ?? "").trim() || undefined
            : undefined,
        actorId: actor.actorId,
        actorName: actor.actorName,
      }, writeClient ?? undefined);

      return NextResponse.json(state);
    }

    if (action === "mark_noise") {
      if (actor.role !== "coordinator") {
        return NextResponse.json(
          { error: "Only the shift coordinator can mark noise." },
          { status: 403 },
        );
      }

      const description = String(body.description ?? "").trim();
      if (!description) {
        return NextResponse.json(
          { error: "description is required for noise alerts." },
          { status: 400 },
        );
      }

      if (isSupabaseAuthConfigured()) {
        const doctorUserId = String(body.doctorUserId ?? "").trim();
        if (!doctorUserId) {
          return NextResponse.json({ error: "doctorUserId is required." }, { status: 400 });
        }
        await assignAlertToDoctor({
          alertId,
          patientId: normalizePatientId(alert.patientId),
          doctorUserId,
          assignedByUserId: actor.actorId,
        });
      }

      const state = await recordNoise(
        alertId,
        description,
        actor.actorId,
        actor.actorName,
        writeClient ?? undefined,
      );
      return NextResponse.json(state);
    }

    if (action === "doctor_confirm") {
      if (actor.role !== "doctor") {
        return NextResponse.json(
          { error: "Only a doctor can confirm alerts." },
          { status: 403 },
        );
      }

      const conclusion = String(body.conclusion ?? "").trim();
      if (!conclusion) {
        return NextResponse.json(
          { error: "conclusion is required." },
          { status: 400 },
        );
      }

      if (isSupabaseAuthConfigured()) {
        const assignment = await getAlertAssignment(alertId);
        if (!assignment || assignment.doctor_user_id !== actor.actorId) {
          return NextResponse.json(
            { error: "This alert is assigned to another doctor." },
            { status: 403 },
          );
        }
      }

      const symptoms = String(body.symptoms ?? "").trim();
      const clinicalNotes = String(body.clinicalNotes ?? "").trim();
      const startedAt = String(body.startedAt ?? "").trim();
      if (isSupabaseAuthConfigured() && (!symptoms || !clinicalNotes || !startedAt)) {
        return NextResponse.json(
          { error: "symptoms, clinicalNotes, and startedAt are required." },
          { status: 400 },
        );
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
      return NextResponse.json(state);
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể ghi hành động." },
      { status: 500 },
    );
  }
}
