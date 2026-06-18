import { createBrowserClient } from "@supabase/ssr";

import { isSupabaseAuthConfigured } from "@/lib/auth/config";

export function createSupabaseBrowserClient() {
  if (!isSupabaseAuthConfigured()) return null;

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
