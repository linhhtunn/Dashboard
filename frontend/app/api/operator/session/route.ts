import { NextResponse } from "next/server";

import { getOperatorActor, getStaffMember } from "@/lib/server/clinical-store";
import type { OperatorRole } from "@/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = (searchParams.get("role") ?? "coordinator") as OperatorRole;
    const actor = getOperatorActor(role);

    if (!actor) {
      return NextResponse.json({ error: "Operator session not found." }, { status: 404 });
    }

    const staff = getStaffMember(actor.staffId);

    return NextResponse.json({
      role: actor.role,
      actor_id: actor.actorId,
      staff_id: actor.staffId,
      name: actor.name,
      zone_code: staff?.zoneCode ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Không thể tải phiên operator.",
      },
      { status: 500 },
    );
  }
}
