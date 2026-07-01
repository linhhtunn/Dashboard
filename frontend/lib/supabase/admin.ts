import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { isDemoModeAllowed } from "@/lib/runtime-config";

let adminClient: SupabaseClient | null = null;

export function isSupabaseServiceRoleConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
        process.env.SUPABASE_SECRET_KEY?.trim()),
  );
}

export function isSupabaseAdminConfigured() {
  const serverKey = isSupabaseServiceRoleConfigured();
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      (serverKey ||
        (isDemoModeAllowed() && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim())),
  );
}

export function createSupabaseAdminClient(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured()) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    (isDemoModeAllowed()
      ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!.trim()
      : "");

  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return adminClient;
}
