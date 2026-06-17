import { NextResponse } from "next/server";

import { getSessionUserProfile } from "@/lib/server/roles-db";
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

export function hasPermission(
  profile: { permissions: Record<string, boolean> },
  key: string,
): boolean {
  return Boolean(profile.permissions[key]);
}

export function isClinicalPersona(value: string): value is ClinicalPersona {
  return value === "admin" || value === "coordinator" || value === "doctor";
}
