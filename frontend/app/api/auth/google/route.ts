import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  buildGoogleAuthUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateOAuthState,
  getGoogleClientId,
  GOOGLE_OAUTH_COOKIE,
  isGoogleOAuthConfigured,
} from "@/lib/auth/google-oauth";
import { sanitizeAuthNextPath } from "@/lib/auth/role-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const nextPath = sanitizeAuthNextPath(searchParams.get("next"));

  if (!isGoogleOAuthConfigured()) {
    const loginUrl = new URL(`${origin}/login`);
    loginUrl.searchParams.set("error", "Google OAuth is not configured");
    return NextResponse.redirect(loginUrl);
  }

  const state = generateOAuthState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const redirectUri = `${origin}/api/auth/google/callback`;

  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 10,
    path: "/",
  };

  cookieStore.set(GOOGLE_OAUTH_COOKIE.state, state, cookieOptions);
  cookieStore.set(GOOGLE_OAUTH_COOKIE.verifier, codeVerifier, cookieOptions);
  if (nextPath) {
    cookieStore.set(GOOGLE_OAUTH_COOKIE.next, nextPath, cookieOptions);
  }

  const authUrl = buildGoogleAuthUrl({
    clientId: getGoogleClientId(),
    redirectUri,
    state,
    codeChallenge,
  });

  return NextResponse.redirect(authUrl);
}
