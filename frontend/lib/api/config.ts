/**
 * Single connection point for clinical APIs.
 * Set NEXT_PUBLIC_CLINICAL_API_BASE to proxy to an external backend later.
 * Example: https://api.hospital.local/v1
 */
export const CLINICAL_API_BASE =
  process.env.NEXT_PUBLIC_CLINICAL_API_BASE?.replace(/\/$/, "") ?? "";

export function clinicalApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${CLINICAL_API_BASE}${normalized}`;
}
