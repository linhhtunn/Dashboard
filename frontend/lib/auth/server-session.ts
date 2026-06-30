import { cookies } from "next/headers";

import {
  AUTH_COOKIE_NAME,
  canUseDemoAuthentication,
  isSupabaseAuthConfigured,
} from "@/lib/auth/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ServerSession =
  | { kind: "supabase"; email: string | undefined }
  | { kind: "demo"; email: string; name: string };

export async function getServerSession(): Promise<ServerSession | null> {
  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        return { kind: "supabase", email: user.email };
      }
    }
  }

  if (!canUseDemoAuthentication()) return null;

  const cookieStore = await cookies();
  const raw = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { email?: string; name?: string };
    if (!parsed.email) return null;
    return {
      kind: "demo",
      email: parsed.email,
      name: parsed.name ?? parsed.email.split("@")[0] ?? "Clinician",
    };
  } catch {
    return null;
  }
}
