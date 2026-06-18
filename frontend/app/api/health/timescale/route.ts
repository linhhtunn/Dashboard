import { NextResponse } from "next/server";

import { probeTimescaleConnection } from "@/lib/server/timescale-pg";

export const runtime = "nodejs";

export async function GET() {
  const result = await probeTimescaleConnection();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
