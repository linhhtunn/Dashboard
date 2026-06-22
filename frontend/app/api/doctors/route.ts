import { NextResponse } from "next/server";

import { requireRole } from "@/lib/server/authz";
import { listDoctorOptions } from "@/lib/server/encounter-db";

export const runtime = "nodejs";

export async function GET() {
  const authz = await requireRole("coordinator");
  if (authz.response) return authz.response;
  try {
    return NextResponse.json({ doctors: await listDoctorOptions() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to list doctors." },
      { status: 500 },
    );
  }
}
