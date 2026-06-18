import { NextResponse } from "next/server";

import { getSessionUserProfile } from "@/lib/server/roles-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const profile = await getSessionUserProfile();
    if (!profile) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    return NextResponse.json({
      profile: {
        user_id: profile.userId,
        role_code: profile.roleCode,
        display_name: profile.displayName,
        email: profile.email,
        permissions: profile.permissions,
        role_label_vi: profile.roleLabelVi,
        role_label_en: profile.roleLabelEn,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load profile." },
      { status: 500 },
    );
  }
}
