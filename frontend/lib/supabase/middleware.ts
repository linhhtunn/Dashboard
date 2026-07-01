import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
  canUseDemoAuthentication,
  isSupabaseAuthConfigured,
} from "@/lib/auth/config";
import { isPublicPageRoute } from "@/lib/auth/public-routes";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const isPageRoute =
    !pathname.startsWith("/api") && !pathname.startsWith("/_next");
  const isApiRoute = pathname.startsWith("/api");
  const isPublicApiRoute = pathname.startsWith("/api/auth/") || pathname.startsWith("/api/internal/");
  const isClinicalApiRoute =
    isApiRoute &&
    !isPublicApiRoute &&
    !pathname.startsWith("/api/admin/") &&
    !pathname.startsWith("/api/me/") &&
    !pathname.startsWith("/api/roles") &&
    !pathname.startsWith("/api/simulator/");
  const isSelfAuthorizingApiRoute =
    pathname === "/api/me/profile" ||
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/api/simulator/");

  if (!isSupabaseAuthConfigured()) {
    if (!canUseDemoAuthentication()) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { error: "Authentication service is not configured." },
          { status: 503 },
        );
      }
      if (isPageRoute && !isPublicPageRoute(pathname)) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("configuration_error", "auth");
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    const demoSession = request.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (!demoSession && isPageRoute && !isPublicPageRoute(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // These handlers perform their own role check. Avoid repeating the same
  // remote auth lookup in both proxy and route handler on the critical path.
  if (isSelfAuthorizingApiRoute) return supabaseResponse;

  // Verify the JWT locally with getClaims() rather than getUser(). getUser() hits
  // the Supabase Auth server on every request; the proxy runs on all routes, so
  // that network round-trip stacked across a page + its parallel API calls and
  // drove the production login timeout. With asymmetric (ES256) signing keys
  // getClaims() verifies the token signature against a cached JWKS with no
  // per-request network call, so the fail-closed gate is preserved (it falls back
  // to a getUser network check automatically for symmetric keys).
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims ?? null;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (!userId && isApiRoute && !isPublicApiRoute) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (userId && isClinicalApiRoute) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role_code")
      .eq("user_id", userId)
      .maybeSingle();
    if (profile?.role_code === "admin") {
      const { data: grant } = await supabase
        .from("break_glass_grants")
        .select("id")
        .eq("user_id", userId)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .limit(1)
        .maybeSingle();
      if (!grant) {
        return NextResponse.json(
          { error: "Admin accounts do not have PHI access without break-glass." },
          { status: 403 },
        );
      }
    }
  }

  if (!userId && isPageRoute && !isPublicPageRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
