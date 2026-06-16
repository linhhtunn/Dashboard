import { NextResponse } from "next/server";

import {
  addScheduleAssignment,
  removeScheduleAssignment,
} from "@/lib/server/clinical-store";
import { mapScheduleSlotDto } from "@/lib/server/dto/staff";
import type { ShiftBand } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      date: string;
      band: ShiftBand;
      staff_id: string;
    };

    if (!body.date || !body.band || !body.staff_id) {
      return NextResponse.json(
        { error: "date, band, and staff_id are required." },
        { status: 400 },
      );
    }

    const slot = addScheduleAssignment(body.date, body.band, body.staff_id);
    return NextResponse.json(mapScheduleSlotDto(slot), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể gán ca trực." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const removed = removeScheduleAssignment(id);
    if (!removed) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể xóa phân công." },
      { status: 500 },
    );
  }
}
