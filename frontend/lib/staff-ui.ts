import {
  getShiftBandHours,
  getShiftBandLabel,
  getShiftRoleLabel,
  getZoneLabel,
} from "@/lib/i18n/domain";
import type { Locale, ShiftBand, ShiftStaffRole } from "@/types";

export function getRoleLabel(role: ShiftStaffRole, locale: Locale) {
  return getShiftRoleLabel(role, locale);
}

export function getBandLabel(band: ShiftBand, locale: Locale) {
  return getShiftBandLabel(band, locale);
}

export { getShiftBandHours, getZoneLabel };

const zoneAccent: Record<string, string> = {
  zone_a: "bg-[color:rgba(13,71,161,0.85)]",
  zone_b: "bg-[color:rgba(0,150,136,0.85)]",
  zone_c: "bg-[color:rgba(124,77,255,0.85)]",
  zone_d: "bg-[color:rgba(245,124,0,0.85)]",
  coordination: "bg-[color:rgba(13,71,161,0.7)]",
  ward_wide: "bg-[color:rgba(138,97,0,0.85)]",
};

export function getZoneAccent(zoneCode: string): string {
  return zoneAccent[zoneCode] ?? "bg-[color:rgba(100,116,139,0.85)]";
}

export const roleAccent: Record<ShiftStaffRole, string> = {
  coordinator:
    "border-[color:rgba(13,71,161,0.35)] bg-[color:rgba(13,71,161,0.1)] text-[color:var(--cs-primary)]",
  floor_nurse:
    "border-[color:rgba(0,150,136,0.35)] bg-[color:rgba(0,150,136,0.1)] text-[color:var(--cs-teal)]",
  doctor:
    "border-[color:rgba(138,97,0,0.35)] bg-[color:rgba(245,179,0,0.12)] text-[color:#8a6100]",
};

export function getStaffInitials(name: string): string {
  const cleaned = name.replace(/^(ĐD\.|YT\.|BS\.)\s*/, "");
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}
