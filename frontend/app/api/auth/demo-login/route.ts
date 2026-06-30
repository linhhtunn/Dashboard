import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, canUseDemoAuthentication } from "@/lib/auth/config";

export const runtime = "nodejs";

type DemoLoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  if (!canUseDemoAuthentication()) {
    return NextResponse.json(
      { error: "Demo authentication is disabled in this environment." },
      { status: 404 },
    );
  }

  const body = (await request.json()) as DemoLoginBody;
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();

  if (!email || !password) {
    return NextResponse.json({ error: "Email và mật khẩu là bắt buộc." }, { status: 400 });
  }

  if (password !== "caresignal") {
    return NextResponse.json({ error: "Mật khẩu demo không đúng." }, { status: 401 });
  }

  const payload = JSON.stringify({
    email,
    name: email.split("@")[0] ?? "Clinician",
  });

  const response = NextResponse.json({ ok: true, email });
  response.cookies.set(AUTH_COOKIE_NAME, payload, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
