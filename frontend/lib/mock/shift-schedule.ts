import {
  buildWeekSchedule,
  getWeekDates,
  getStaffMember as resolveScheduleStaff,
} from "@/lib/server/clinical-store";

export { buildWeekSchedule, getWeekDates, resolveScheduleStaff };

export function getWeekStartKey(anchor = new Date()): string {
  return getWeekDates(anchor)[0];
}

export function getStaffShortName(name: string): string {
  const parts = name.replace(/^(ĐD\.|YT\.|BS\.)\s*/, "").split(" ");
  if (parts.length >= 2) {
    return `${parts[parts.length - 1]} ${parts[0].charAt(0)}.`;
  }
  return name;
}

export const SHIFT_BANDS = ["morning", "afternoon", "night"] as const;
