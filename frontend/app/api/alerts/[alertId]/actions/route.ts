import { NextResponse } from "next/server";

import {
  recordDoctorConfirm,
  recordNoise,
  recordNurseTreatment,
} from "@/lib/mock/alert-workflow-store";
import { getAlertById, getFloorNurses, getOperatorActor } from "@/lib/server/clinical-store";
import { normalizePatientId } from "@/lib/patient-id";
import type { OperatorRole } from "@/types";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ alertId: string }> };

async function findAlert(alertId: string) {
  return (await getAlertById(alertId)) ?? null;
}

async function getActor(request: Request) {
  const role = (request.headers.get("x-operator-role") ?? "coordinator") as OperatorRole;
  const session = await getOperatorActor(role);
  return {
    role,
    actorId: request.headers.get("x-operator-id") ?? session?.actorId ?? role,
    actorName: request.headers.get("x-operator-name") ?? session?.name ?? role,
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
    const actor = await getActor(request);

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
      });

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

      const state = await recordNoise(alertId, description, actor.actorId, actor.actorName);
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

      const state = await recordDoctorConfirm(
        alertId,
        conclusion,
        actor.actorId,
        actor.actorName,
      );
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
