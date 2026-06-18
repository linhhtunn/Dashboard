import { NextResponse } from "next/server";

import { getAlertActionHistory } from "@/lib/mock/alert-workflow-store";
import { getAlertById } from "@/lib/server/clinical-store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ alertId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { alertId } = await context.params;
    const exists = Boolean(await getAlertById(alertId));
    if (!exists) {
      return NextResponse.json({ error: "Alert not found." }, { status: 404 });
    }

    return NextResponse.json(await getAlertActionHistory(alertId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tải lịch sử." },
      { status: 500 },
    );
  }
}
