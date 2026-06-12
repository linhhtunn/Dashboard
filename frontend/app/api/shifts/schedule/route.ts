import { NextResponse } from "next/server";

import { mapScheduleSlotDto } from "@/lib/server/dto/staff";
import { buildWeekSchedule, getWeekDates } from "@/lib/server/clinical-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get("weekStart") ?? undefined;
    const slots = buildWeekSchedule(weekStart ?? undefined);
    const dates = getWeekDates(weekStart ? new Date(`${weekStart}T00:00:00`) : new Date());

    return NextResponse.json({
      week_start: dates[0],
      week_end: dates[dates.length - 1],
      dates,
      slots: slots.map(mapScheduleSlotDto),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải lịch ca." },
      { status: 500 },
    );
  }
}
