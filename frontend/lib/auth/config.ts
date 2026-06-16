export function isSupabaseAuthConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export const AUTH_COOKIE_NAME = "caresignal-demo-auth";

export const PUBLIC_PATH_PREFIXES = [
  "/",
  "/login",
  "/auth",
  "/api/auth",
] as const;

export function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => prefix !== "/" && pathname.startsWith(prefix),
  );
}
