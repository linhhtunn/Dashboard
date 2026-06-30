import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { escalateOverdueCriticalAlerts } from "@/lib/server/alert-delivery";

export const runtime = "nodejs";

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim() || process.env.ALERT_DISPATCH_SECRET?.trim();
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!expected || !provided) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    return NextResponse.json(await escalateOverdueCriticalAlerts());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Escalation failed." },
      { status: 500 },
    );
  }
}

export const GET = POST;
