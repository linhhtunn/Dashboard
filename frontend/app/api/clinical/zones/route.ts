import { NextResponse } from "next/server";

const ZONE_CODES = [
  "coordination",
  "ward_wide",
  "zone_a",
  "zone_b",
  "zone_c",
  "zone_d",
] as const;

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ zone_codes: ZONE_CODES });
}
