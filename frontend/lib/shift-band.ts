import type { ShiftBand } from "@/types";

/** Ca sáng 06–14, ca chiều 14–22, ca đêm 22–06 */
export function getCurrentShiftBand(now = new Date()): ShiftBand {
  const hour = now.getHours();
  if (hour >= 6 && hour < 14) return "morning";
  if (hour >= 14 && hour < 22) return "afternoon";
  return "night";
}
