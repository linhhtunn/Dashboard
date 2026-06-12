"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { getWardLabelByCode } from "@/lib/i18n/domain";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import { getBandLabel, getShiftBandHours } from "@/lib/staff-ui";
import type { Shift, ShiftBand, ShiftScheduleSlot, ShiftStaffMember } from "@/types";

type ShiftWeekCalendarProps = {
  shift: Shift;
  dates: string[];
  slots: ShiftScheduleSlot[];
  staffById: Record<string, ShiftStaffMember>;
  onCellClick: (date: string, band: ShiftBand) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
};

const BANDS: ShiftBand[] = ["morning", "afternoon", "night"];

const bandSurface: Record<ShiftBand, string> = {
  morning:
    "border-l-[3px] border-l-[color:var(--cs-primary)] bg-[linear-gradient(90deg,rgba(13,71,161,0.1),rgba(255,255,255,0.35))]",
  afternoon:
    "border-l-[3px] border-l-[color:#e6a700] bg-[linear-gradient(90deg,rgba(245,179,0,0.12),rgba(255,255,255,0.35))]",
  night:
    "border-l-[3px] border-l-[color:#5e35b1] bg-[linear-gradient(90deg,rgba(94,53,177,0.12),rgba(255,255,255,0.35))]",
};

function formatDayHeader(dateKey: string, locale: "vi" | "en"): string {
  const date = new Date(`${dateKey}T12:00:00`);
  const weekday = date.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
    weekday: "short",
  });
  const day = date.getDate();
  return `${weekday} ${day}`;
}

function isToday(dateKey: string): boolean {
  return dateKey === new Date().toISOString().slice(0, 10);
}

function summarizeCell(
  cellSlots: ShiftScheduleSlot[],
  staffById: Record<string, ShiftStaffMember>,
) {
  const members = cellSlots
    .map((slot) => staffById[slot.staffId])
    .filter((member): member is ShiftStaffMember => Boolean(member));

  return {
    coordinator: members.filter((m) => m.role === "coordinator").length,
    doctor: members.filter((m) => m.role === "doctor").length,
    floor_nurse: members.filter((m) => m.role === "floor_nurse").length,
    total: members.length,
  };
}

export function ShiftWeekCalendar({
  shift,
  dates,
  slots,
  staffById,
  onCellClick,
  onPrevWeek,
  onNextWeek,
  onToday,
}: ShiftWeekCalendarProps) {
  const { locale } = useLocale();
  const ui = useClinicalUi();

  function slotsFor(date: string, band: ShiftBand) {
    return slots.filter((slot) => slot.date === date && slot.band === band);
  }

  return (
    <section className="dashboard-surface flex h-full min-h-0 flex-col overflow-hidden rounded-[1.15rem]">
      <header className="shrink-0 border-b border-white/45 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[14px] font-semibold text-[color:var(--cs-heading)]">
              {ui.staff.calendarTitle}
            </h2>
            <p className="mt-0.5 text-[11px] text-[color:var(--cs-text-soft)]">
              {ui.staff.ward}: {getWardLabelByCode(shift.wardCode, locale)} · {dates[0]} →{" "}
              {dates[dates.length - 1]}
            </p>
            <p className="mt-1 text-[10px] text-[color:var(--cs-text-soft)]">
              {ui.staff.cellClickHint}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrevWeek}
              className="dashboard-input flex h-8 w-8 items-center justify-center rounded-[0.6rem]"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToday}
              className="dashboard-input h-8 rounded-[0.6rem] px-2.5 text-[11px] font-semibold"
            >
              {ui.common.today}
            </button>
            <button
              type="button"
              onClick={onNextWeek}
              className="dashboard-input flex h-8 w-8 items-center justify-center rounded-[0.6rem]"
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden px-5 pb-4 pt-2">
        <div className="grid h-full min-h-0 grid-cols-[84px_repeat(7,minmax(0,1fr))] grid-rows-[auto_repeat(3,minmax(0,1fr))] gap-x-3 gap-y-2.5">
          <div />
          {dates.map((date) => (
            <div
              key={date}
              className={[
                "flex items-center justify-center rounded-[0.8rem] px-2 py-2.5 text-center text-[12px] font-semibold",
                isToday(date)
                  ? "bg-[linear-gradient(135deg,rgba(13,71,161,0.16),rgba(0,150,136,0.1))] text-[color:var(--cs-primary)] ring-1 ring-[color:rgba(13,71,161,0.2)]"
                  : "bg-white/45 text-[color:var(--cs-text-soft)]",
              ].join(" ")}
            >
              {formatDayHeader(date, locale)}
            </div>
          ))}

          {BANDS.map((band) => (
            <div key={band} className="contents">
              <div className="flex flex-col justify-center rounded-[0.8rem] border border-white/50 bg-white/60 px-2.5 py-3">
                <p className="text-[12px] font-semibold leading-4 text-[color:var(--cs-heading)]">
                  {getBandLabel(band, locale)}
                </p>
                <p className="mt-0.5 text-[10px] leading-3 text-[color:var(--cs-text-soft)]">
                  {getShiftBandHours(band)}
                </p>
              </div>
              {dates.map((date) => {
                const cellSlots = slotsFor(date, band);
                const summary = summarizeCell(cellSlots, staffById);
                return (
                  <button
                    key={`${date}-${band}`}
                    type="button"
                    onClick={() => onCellClick(date, band)}
                    className={[
                      "group flex h-full min-h-[56px] items-center rounded-[0.8rem] border border-white/50 px-3 py-2 text-left transition",
                      bandSurface[band],
                      "hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]",
                      isToday(date) ? "ring-1 ring-[color:rgba(13,71,161,0.12)]" : "",
                    ].join(" ")}
                  >
                      {summary.total === 0 ? (
                        <span className="text-[10px] text-[color:var(--cs-text-soft)]">
                          {ui.staff.cellEmpty}
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1">
                          {summary.doctor > 0 ? (
                            <span className="rounded-[0.4rem] bg-[color:rgba(138,97,0,0.14)] px-1 py-px text-[9px] font-semibold tabular-nums text-[color:#8a6100]">
                              {summary.doctor}
                              <span className="ml-0.5 font-medium opacity-80">
                                {ui.staff.badgeDoctor}
                              </span>
                            </span>
                          ) : null}
                          {summary.floor_nurse > 0 ? (
                            <span className="rounded-[0.4rem] bg-[color:rgba(0,150,136,0.12)] px-1 py-px text-[9px] font-semibold tabular-nums text-[color:var(--cs-teal)]">
                              {summary.floor_nurse}
                              <span className="ml-0.5 font-medium opacity-80">
                                {ui.staff.badgeNurse}
                              </span>
                            </span>
                          ) : null}
                          {summary.coordinator > 0 ? (
                            <span className="rounded-[0.4rem] bg-[color:rgba(13,71,161,0.1)] px-1 py-px text-[9px] font-semibold tabular-nums text-[color:var(--cs-primary)]">
                              {summary.coordinator}
                              <span className="ml-0.5 font-medium opacity-80">
                                {ui.staff.badgeCoordinator}
                              </span>
                            </span>
                          ) : null}
                        </div>
                      )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
