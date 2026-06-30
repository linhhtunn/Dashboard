import { NextResponse } from "next/server";

import { canUseDemoAuthentication, isSupabaseAuthConfigured } from "@/lib/auth/config";
import { getSessionUserProfile } from "@/lib/server/roles-db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ClinicalPersona } from "@/types";

export async function requireAuthenticatedProfile() {
  const profile = await getSessionUserProfile();
  if (!profile) {
    return {
      profile: null,
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }
  return { profile, response: null };
}

export async function requireAdminProfile() {
  const result = await requireAuthenticatedProfile();
  if (result.response) return result;

  if (result.profile!.roleCode !== "admin") {
    return {
      profile: result.profile,
      response: NextResponse.json({ error: "Admin access required." }, { status: 403 }),
    };
  }

  return result;
}

export async function requireRole(role: ClinicalPersona) {
  const result = await requireAuthenticatedProfile();
  if (result.response) return result;
  if (result.profile!.roleCode !== role) {
    return {
      profile: result.profile,
      response: NextResponse.json({ error: `${role} access required.` }, { status: 403 }),
    };
  }
  return result;
}

export async function requireClinicalAccess() {
  if (!isSupabaseAuthConfigured()) {
    if (canUseDemoAuthentication()) return { profile: null, response: null };
    return {
      profile: null,
      response: NextResponse.json(
        { error: "Clinical access is unavailable until authentication is configured." },
        { status: 503 },
      ),
    };
  }

  const result = await requireAuthenticatedProfile();
  if (result.response) return result;

  if (result.profile!.roleCode === "admin") {
    const supabase = await createSupabaseServerClient();
    const { data: grant } = supabase
      ? await supabase
          .from("break_glass_grants")
          .select("id")
          .eq("user_id", result.profile!.userId)
          .is("revoked_at", null)
          .gt("expires_at", new Date().toISOString())
          .limit(1)
          .maybeSingle()
      : { data: null };
    if (grant) return result;
  }

  if (!hasPermission(result.profile!, "clinical_access")) {
    return {
      profile: result.profile,
      response: NextResponse.json(
        { error: "Clinical access required." },
        { status: 403 },
      ),
    };
  }

  return result;
}

export function hasPermission(
  profile: { permissions: Record<string, boolean> },
  key: string,
): boolean {
  return Boolean(profile.permissions[key]);
}

export function isClinicalPersona(value: string): value is ClinicalPersona {
  return value === "admin" || value === "coordinator" || value === "doctor";
}
