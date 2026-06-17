import {
  buildWeekSchedule,
  getStaffMember as resolveScheduleStaff,
} from "@/lib/server/clinical-store";

export { buildWeekSchedule, resolveScheduleStaff };

function startOfWeek(date: Date): Date {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getWeekDates(anchor = new Date()): string[] {
  const monday = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(monday);
    next.setDate(monday.getDate() + index);
    return toDateKey(next);
  });
}

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
