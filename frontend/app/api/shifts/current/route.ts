import { NextResponse } from "next/server";

import { mapShiftDto } from "@/lib/server/dto/staff";
import { getShift, updateShiftCoordinator } from "@/lib/server/clinical-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(mapShiftDto(getShift()));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải ca trực." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { coordinator_id?: string; coordinatorId?: string };
    const coordinatorId = body.coordinator_id ?? body.coordinatorId;
    if (!coordinatorId) {
      return NextResponse.json(
        { error: "coordinator_id is required." },
        { status: 400 },
      );
    }
    return NextResponse.json(mapShiftDto(updateShiftCoordinator(coordinatorId)));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể cập nhật ca trực." },
      { status: 500 },
    );
  }
}
