import { NextResponse } from "next/server";

import { resolveRedirectPathForRole, sanitizeAuthNextPath } from "@/lib/auth/role-redirect";
import { getSessionUserProfile } from "@/lib/server/roles-db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Supabase email confirmation / password recovery callback (not Google OAuth). */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeAuthNextPath(searchParams.get("next"));
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const loginUrl = new URL(`${origin}/login`);
        loginUrl.searchParams.set("error", error.message);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  const profile = await getSessionUserProfile();
  return NextResponse.redirect(
    `${origin}${resolveRedirectPathForRole(profile?.roleCode, next)}`,
  );
}
