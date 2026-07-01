import { NextResponse } from "next/server";

import { isClinicalPersona, requireAdminProfile } from "@/lib/server/authz";
import {
  listUserProfiles,
  patchUserProfile,
  upsertUserProfile,
} from "@/lib/server/roles-db";
import {
  createSupabaseAdminClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";
import type { ClinicalPersona } from "@/types";
import { isDemoModeAllowed } from "@/lib/runtime-config";

export const runtime = "nodejs";

export type AdminUserRecord = {
  id: string;
  email: string;
  displayName: string;
  role: ClinicalPersona;
  createdAt: string;
  lastSignInAt: string | null;
};

const DEMO_USERS: AdminUserRecord[] = [
  {
    id: "demo-admin",
    email: "admin@caresignal.local",
    displayName: "Quản trị viên",
    role: "admin",
    createdAt: "2026-01-01T00:00:00.000Z",
    lastSignInAt: null,
  },
  {
    id: "demo-coordinator",
    email: "coordinator@caresignal.local",
    displayName: "ĐD. Minh Anh",
    role: "coordinator",
    createdAt: "2026-01-02T00:00:00.000Z",
    lastSignInAt: null,
  },
  {
    id: "demo-doctor",
    email: "doctor@caresignal.local",
    displayName: "BS. Hoàng Nam",
    role: "doctor",
    createdAt: "2026-01-03T00:00:00.000Z",
    lastSignInAt: null,
  },
];

let demoStore = [...DEMO_USERS];

async function listAuthUsers(): Promise<AdminUserRecord[]> {
  if (!isSupabaseServiceRoleConfigured()) {
    if (isDemoModeAllowed()) return demoStore;
    throw new Error("Supabase service-role key is not configured.");
  }
  const admin = createSupabaseAdminClient();
  if (!admin?.auth.admin.listUsers) {
    if (isDemoModeAllowed()) return demoStore;
    throw new Error("Supabase admin API is not configured.");
  }

  const profiles = await listUserProfiles();
  const profileMap = new Map(profiles.map((profile) => [profile.userId, profile]));

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) {
    throw new Error(error.message);
  }

  return (data.users ?? []).map((user) => {
    const profile = profileMap.get(user.id);
    return {
      id: user.id,
      email: user.email ?? profile?.email ?? "",
      displayName:
        profile?.displayName ??
        String(user.user_metadata?.display_name ?? user.email ?? user.id),
      role: profile?.roleCode ?? "coordinator",
      createdAt: user.created_at ?? new Date().toISOString(),
      lastSignInAt: user.last_sign_in_at ?? null,
    };
  });
}

export async function GET() {
  const authz = await requireAdminProfile();
  if (authz.response) {
    if (authz.response.status === 401 && isDemoModeAllowed()) {
      return NextResponse.json({ users: demoStore, source: "demo" });
    }
    return authz.response;
  }

  try {
    const users = await listAuthUsers();
    return NextResponse.json({ users, source: "supabase" });
  } catch (error) {
    if (!isDemoModeAllowed()) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load users." },
        { status: 503 },
      );
    }
    return NextResponse.json({
      users: demoStore,
      source: "demo",
      warning: error instanceof Error ? error.message : "Failed to load users.",
    });
  }
}

export async function POST(request: Request) {
  const authz = await requireAdminProfile();
  if (authz.response && !isDemoModeAllowed()) return authz.response;
  if (authz.response?.status === 403) return authz.response;

  const body = (await request.json()) as Record<string, unknown>;
  const email = String(body.email ?? "").trim().toLowerCase();
  const displayName = String(body.displayName ?? "").trim();
  const password = String(body.password ?? "").trim();
  const role = body.role;

  if (!email || !displayName) {
    return NextResponse.json({ error: "email and displayName are required." }, { status: 400 });
  }

  const clinicalRole: ClinicalPersona = isClinicalPersona(String(role)) ? (role as ClinicalPersona) : "coordinator";

  const admin = isSupabaseServiceRoleConfigured()
    ? createSupabaseAdminClient()
    : null;
  if (admin?.auth.admin.createUser && password.length >= 6 && authz.profile) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, clinical_role: clinicalRole },
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (data.user) {
      await upsertUserProfile({
        userId: data.user.id,
        roleCode: clinicalRole,
        displayName,
        email,
      });
      return NextResponse.json(
        {
          user: {
            id: data.user.id,
            email,
            displayName,
            role: clinicalRole,
            createdAt: data.user.created_at ?? new Date().toISOString(),
            lastSignInAt: data.user.last_sign_in_at ?? null,
          },
        },
        { status: 201 },
      );
    }
  }

  if (!isDemoModeAllowed()) {
    return NextResponse.json({ error: "Supabase admin API is unavailable." }, { status: 503 });
  }
  const user: AdminUserRecord = {
    id: `demo-${Math.random().toString(36).slice(2, 9)}`,
    email,
    displayName,
    role: clinicalRole,
    createdAt: new Date().toISOString(),
    lastSignInAt: null,
  };
  demoStore = [...demoStore, user];
  return NextResponse.json({ user, source: "demo" }, { status: 201 });
}

export async function PATCH(request: Request) {
  const authz = await requireAdminProfile();
  if (authz.response && !isDemoModeAllowed()) return authz.response;
  if (authz.response?.status === 403) return authz.response;

  const body = (await request.json()) as Record<string, unknown>;
  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const clinicalRole = isClinicalPersona(String(body.role)) ? (body.role as ClinicalPersona) : undefined;
  const displayName =
    body.displayName !== undefined ? String(body.displayName).trim() : undefined;

  const admin = isSupabaseServiceRoleConfigured()
    ? createSupabaseAdminClient()
    : null;
  if (admin?.auth.admin.updateUserById && authz.profile && !id.startsWith("demo-")) {
    const metadata: Record<string, unknown> = {};
    if (displayName !== undefined) metadata.display_name = displayName;
    if (clinicalRole) metadata.clinical_role = clinicalRole;

    if (Object.keys(metadata).length > 0) {
      const { error } = await admin.auth.admin.updateUserById(id, {
        user_metadata: metadata,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    if (clinicalRole) {
      await patchUserProfile(id, { roleCode: clinicalRole });
    }
    if (displayName !== undefined) {
      await patchUserProfile(id, { displayName });
    }

    const profiles = await listUserProfiles();
    const profile = profiles.find((item) => item.userId === id);
    if (profile) {
      return NextResponse.json({
        user: {
          id,
          email: profile.email ?? "",
          displayName: profile.displayName ?? id,
          role: profile.roleCode,
          createdAt: new Date().toISOString(),
          lastSignInAt: null,
        },
      });
    }
  }

  if (!isDemoModeAllowed()) {
    return NextResponse.json({ error: "Supabase admin API is unavailable." }, { status: 503 });
  }
  const index = demoStore.findIndex((item) => item.id === id);
  if (index < 0) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const next = { ...demoStore[index] };
  if (displayName !== undefined) next.displayName = displayName;
  if (clinicalRole) next.role = clinicalRole;
  demoStore = demoStore.map((item) => (item.id === id ? next : item));
  return NextResponse.json({ user: next, source: "demo" });
}

export async function DELETE(request: Request) {
  const authz = await requireAdminProfile();
  if (authz.response && !isDemoModeAllowed()) return authz.response;
  if (authz.response?.status === 403) return authz.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id query param is required." }, { status: 400 });
  }

  const admin = isSupabaseServiceRoleConfigured()
    ? createSupabaseAdminClient()
    : null;
  if (admin?.auth.admin.deleteUser && authz.profile && !id.startsWith("demo-")) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (!isDemoModeAllowed()) {
    return NextResponse.json({ error: "Supabase admin API is unavailable." }, { status: 503 });
  }
  const before = demoStore.length;
  demoStore = demoStore.filter((item) => item.id !== id);
  if (demoStore.length === before) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, source: "demo" });
}
