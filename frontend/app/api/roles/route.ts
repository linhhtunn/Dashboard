import { NextResponse } from "next/server";

import { listRoles } from "@/lib/server/roles-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const roles = await listRoles();
    return NextResponse.json({ roles });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load roles." },
      { status: 500 },
    );
  }
}
