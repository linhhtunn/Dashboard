import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ClinicalPersona, RolePermissions } from "@/types";

export type DbRoleRow = {
  code: ClinicalPersona;
  label_vi: string;
  label_en: string;
  description_vi: string | null;
  description_en: string | null;
  permissions: RolePermissions;
  sort_order: number;
};

export type DbUserProfileRow = {
  user_id: string;
  role_code: ClinicalPersona;
  display_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

type DbUserProfileWithRole = DbUserProfileRow & {
  role: DbRoleRow | DbRoleRow[] | null;
};

export type UserProfile = {
  userId: string;
  roleCode: ClinicalPersona;
  displayName: string | null;
  email: string | null;
  permissions: RolePermissions;
  roleLabelVi: string;
  roleLabelEn: string;
};

const DEFAULT_ROLE_PERMISSIONS: Record<ClinicalPersona, RolePermissions> = {
  coordinator: {
    clinical_access: true,
    record_treatment: true,
    confirm_alerts: false,
    simulation: false,
    manage_users: false,
  },
  doctor: {
    clinical_access: true,
    record_treatment: false,
    confirm_alerts: true,
    simulation: false,
    manage_users: false,
  },
  admin: {
    clinical_access: false,
    record_treatment: false,
    confirm_alerts: false,
    simulation: true,
    manage_users: true,
  },
};

function isMissingTableError(message: string) {
  return message.includes("Could not find the table") || message.includes("PGRST205");
}

function normalizePermissions(
  roleCode: ClinicalPersona,
  permissions?: Partial<RolePermissions> | null,
): RolePermissions {
  return {
    ...DEFAULT_ROLE_PERMISSIONS[roleCode],
    ...(permissions ?? {}),
  };
}

function isRoleCode(value: unknown): value is ClinicalPersona {
  return value === "admin" || value === "coordinator" || value === "doctor";
}

function fallbackRole(code: ClinicalPersona): DbRoleRow {
  return {
    code,
    label_vi:
      code === "admin"
        ? "Quản trị viên"
        : code === "doctor"
          ? "Bác sĩ trực"
          : "Điều dưỡng điều phối",
    label_en:
      code === "admin"
        ? "Administrator"
        : code === "doctor"
          ? "On-call physician"
          : "Shift coordinator",
    description_vi: null,
    description_en: null,
    permissions: DEFAULT_ROLE_PERMISSIONS[code],
    sort_order: code === "coordinator" ? 10 : code === "doctor" ? 20 : 30,
  };
}

function mapProfile(row: DbUserProfileRow, role: DbRoleRow): UserProfile {
  return {
    userId: row.user_id,
    roleCode: row.role_code,
    displayName: row.display_name,
    email: row.email,
    permissions: normalizePermissions(row.role_code, role.permissions),
    roleLabelVi: role.label_vi,
    roleLabelEn: role.label_en,
  };
}

export async function listRoles(): Promise<DbRoleRow[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data, error } = await admin.from("roles").select("*").order("sort_order");
  if (error) {
    if (isMissingTableError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []) as DbRoleRow[];
}

export async function getRoleByCode(code: ClinicalPersona): Promise<DbRoleRow | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const { data, error } = await admin.from("roles").select("*").eq("code", code).maybeSingle();
  if (error) {
    if (isMissingTableError(error.message)) return null;
    throw new Error(error.message);
  }

  return (data as DbRoleRow | null) ?? null;
}

export async function getUserProfileById(userId: string): Promise<UserProfile | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    if (isMissingTableError(profileError.message)) return null;
    throw new Error(profileError.message);
  }

  if (!profile) return null;

  const role = await getRoleByCode((profile as DbUserProfileRow).role_code);
  if (!role) {
    const row = profile as DbUserProfileRow;
    return mapProfile(row, fallbackRole(row.role_code));
  }

  return mapProfile(profile as DbUserProfileRow, role);
}

export async function listUserProfiles(): Promise<UserProfile[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data: profiles, error } = await admin
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTableError(error.message)) return [];
    throw new Error(error.message);
  }

  const roles = await listRoles();
  const roleMap = new Map(roles.map((role) => [role.code, role]));

  return ((profiles ?? []) as DbUserProfileRow[])
    .map((profile) => {
      const role = roleMap.get(profile.role_code);
      return role ? mapProfile(profile, role) : null;
    })
    .filter((item): item is UserProfile => item !== null);
}

export async function upsertUserProfile(input: {
  userId: string;
  roleCode: ClinicalPersona;
  displayName?: string | null;
  email?: string | null;
}): Promise<UserProfile | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const { error } = await admin.from("user_profiles").upsert(
    {
      user_id: input.userId,
      role_code: input.roleCode,
      display_name: input.displayName ?? null,
      email: input.email ?? null,
    },
    { onConflict: "user_id" },
  );

  if (error) throw new Error(error.message);
  return getUserProfileById(input.userId);
}

export async function updateUserProfileRole(
  userId: string,
  roleCode: ClinicalPersona,
): Promise<UserProfile | null> {
  return patchUserProfile(userId, { roleCode });
}

export async function patchUserProfile(
  userId: string,
  patch: {
    roleCode?: ClinicalPersona;
    displayName?: string | null;
    email?: string | null;
  },
): Promise<UserProfile | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const updates: Record<string, unknown> = {};
  if (patch.roleCode) updates.role_code = patch.roleCode;
  if (patch.displayName !== undefined) updates.display_name = patch.displayName;
  if (patch.email !== undefined) updates.email = patch.email;

  if (Object.keys(updates).length === 0) {
    return getUserProfileById(userId);
  }

  const { error } = await admin.from("user_profiles").update(updates).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return getUserProfileById(userId);
}

export async function getSessionUserProfile(): Promise<UserProfile | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*, role:roles(*)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    if (isMissingTableError(profileError.message)) return null;
    throw new Error(profileError.message);
  }

  if (!profile) {
    const metadataRole = user.user_metadata?.clinical_role;
    const roleCode = isRoleCode(metadataRole) ? metadataRole : "coordinator";
    const role = (await getRoleByCode(roleCode)) ?? fallbackRole(roleCode);

    return mapProfile(
      {
        user_id: user.id,
        role_code: roleCode,
        display_name:
          typeof user.user_metadata?.display_name === "string"
            ? user.user_metadata.display_name
            : typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name
              : null,
        email: user.email ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      role,
    );
  }

  const profileWithRole = profile as DbUserProfileWithRole;
  const relatedRole = Array.isArray(profileWithRole.role)
    ? profileWithRole.role[0]
    : profileWithRole.role;
  return mapProfile(
    profileWithRole,
    relatedRole ?? fallbackRole(profileWithRole.role_code),
  );
}
