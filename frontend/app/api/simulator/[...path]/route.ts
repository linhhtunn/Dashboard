import { NextRequest, NextResponse } from "next/server";

import { requireAdminProfile } from "@/lib/server/authz";

export const runtime = "nodejs";

const DEFAULT_SIMULATOR_API_BASE = "http://127.0.0.1:8021";

async function proxySimulator(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const authz = await requireAdminProfile();
  if (authz.response) return authz.response;

  const { path } = await context.params;
  const baseUrl = process.env.SIMULATOR_API_BASE ?? DEFAULT_SIMULATOR_API_BASE;
  const targetPath = path[0] === "health" ? "/health" : `/simulator/${path.join("/")}`;
  const targetUrl = new URL(targetPath, baseUrl);
  targetUrl.search = request.nextUrl.search;

  try {
    const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.text();
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: body ? { "content-type": request.headers.get("content-type") ?? "application/json" } : undefined,
      body,
      cache: "no-store",
    });
    const text = await response.text();
    const contentType = response.headers.get("content-type") ?? "application/json";
    return new NextResponse(text, {
      status: response.status,
      headers: { "content-type": contentType },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not reach realtime simulator service.",
      },
      { status: 502 },
    );
  }
}

export const GET = proxySimulator;
export const POST = proxySimulator;
export const PATCH = proxySimulator;
export const DELETE = proxySimulator;
