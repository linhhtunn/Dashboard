import type { ClinicalPersona } from "@/types";

export const ADMIN_HOME_PATH = "/admin/users";
export const CLINICAL_HOME_PATH = "/overview";
export const LEGACY_PATIENTS_HOME_PATH = "/patients";

export function getRoleHomePath(roleCode?: ClinicalPersona | null) {
  return roleCode === "admin" ? ADMIN_HOME_PATH : CLINICAL_HOME_PATH;
}

export function sanitizeAuthNextPath(nextPath?: string | null) {
  if (!nextPath?.startsWith("/") || nextPath.startsWith("//")) return null;
  return nextPath;
}

export function shouldUseRoleHomePath(nextPath?: string | null) {
  const normalized = sanitizeAuthNextPath(nextPath);
  return !normalized || normalized === LEGACY_PATIENTS_HOME_PATH;
}

export function resolveRedirectPathForRole(
  roleCode?: ClinicalPersona | null,
  nextPath?: string | null,
) {
  const normalized = sanitizeAuthNextPath(nextPath);
  if (!normalized || normalized === LEGACY_PATIENTS_HOME_PATH) {
    return getRoleHomePath(roleCode);
  }
  return normalized;
}
