import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  exchangeGoogleCode,
  getGoogleClientId,
  GOOGLE_OAUTH_COOKIE,
  isGoogleOAuthConfigured,
} from "@/lib/auth/google-oauth";
import {
  resolveRedirectPathForRole,
  sanitizeAuthNextPath,
} from "@/lib/auth/role-redirect";
import { getSessionUserProfile } from "@/lib/server/roles-db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectToLogin(origin: string, message: string) {
  const loginUrl = new URL(`${origin}/login`);
  loginUrl.searchParams.set("error", message);
  const response = NextResponse.redirect(loginUrl);

  for (const name of Object.values(GOOGLE_OAUTH_COOKIE)) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }

  return response;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const providerError = searchParams.get("error");

  const cookieStore = await cookies();
  const savedState = cookieStore.get(GOOGLE_OAUTH_COOKIE.state)?.value;
  const codeVerifier = cookieStore.get(GOOGLE_OAUTH_COOKIE.verifier)?.value;
  const next = sanitizeAuthNextPath(cookieStore.get(GOOGLE_OAUTH_COOKIE.next)?.value);

  if (providerError) {
    return redirectToLogin(
      origin,
      searchParams.get("error_description") ?? providerError,
    );
  }

  if (!code || !state || !savedState || !codeVerifier) {
    return redirectToLogin(origin, "Missing OAuth parameters");
  }

  if (state !== savedState) {
    return redirectToLogin(origin, "Invalid OAuth state");
  }

  if (!isGoogleOAuthConfigured()) {
    return redirectToLogin(origin, "Google OAuth is not configured");
  }

  try {
    const redirectUri = `${origin}/api/auth/google/callback`;
    const tokens = await exchangeGoogleCode({
      code,
      codeVerifier,
      clientId: getGoogleClientId(),
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri,
    });

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return redirectToLogin(origin, "Supabase is not configured");
    }

    const { error: signInError } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: tokens.id_token,
    });

    if (signInError) {
      return redirectToLogin(origin, signInError.message);
    }

    const profile = await getSessionUserProfile();
    const redirectPath = resolveRedirectPathForRole(profile?.roleCode, next);
    const response = NextResponse.redirect(`${origin}${redirectPath}`);
    for (const name of Object.values(GOOGLE_OAUTH_COOKIE)) {
      response.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
    return response;
  } catch (nextError: unknown) {
    const message =
      nextError instanceof Error ? nextError.message : "OAuth sign-in failed";
    return redirectToLogin(origin, message);
  }
}
