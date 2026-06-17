export function isSupabaseAuthConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
  );
}

export const AUTH_COOKIE_NAME = "caresignal-demo-auth";

export { isPublicPageRoute, PUBLIC_PAGE_PREFIXES } from "@/lib/auth/public-routes";
