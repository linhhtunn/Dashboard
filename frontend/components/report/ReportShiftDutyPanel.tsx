"use client";

import { ChevronDown, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { localizeText } from "@/lib/i18n";
import {
  getRoleLabel,
  getZoneLabel,
  roleAccent,
} from "@/lib/staff-ui";
import type { ReportOverviewResponse, ReportShiftStaffMember } from "@/lib/report/types";
import type { ShiftStaffRole } from "@/types";

type ReportShiftDutyPanelProps = {
  data: ReportOverviewResponse | null;
  loading: boolean;
  labels: {
    title: string;
    patients: string;
    today: string;
    zone: string;
    empty: string;
    statusActive: string;
    statusBreak: string;
    statusOff: string;
    staffOnDuty: string;
    expand: string;
    collapse: string;
  };
};

const roleOrder: ShiftStaffRole[] = ["coordinator", "doctor", "floor_nurse"];

const statusDot: Record<ReportShiftStaffMember["status"], string> = {
  active: "bg-[color:var(--cs-teal)]",
  break: "bg-[color:#f5b300]",
  off: "bg-[color:var(--cs-text-soft)]",
};

export function ReportShiftDutyPanel({
  data,
  loading,
  labels,
}: ReportShiftDutyPanelProps) {
  const { locale } = useLocale();
  const [expanded, setExpanded] = useState(false);

  const grouped = useMemo(() => {
    if (!data) return null;
    const map: Record<ShiftStaffRole, ReportShiftStaffMember[]> = {
      coordinator: [],
      floor_nurse: [],
      doctor: [],
    };
    for (const member of data.shift_staff) {
      map[member.role].push(member);
    }
    return map;
  }, [data]);

  if (loading || !data || !grouped) {
    return <div className="dashboard-surface h-14 animate-pulse rounded-[1rem]" />;
  }

  const statusLabel = (status: ReportShiftStaffMember["status"]) => {
    if (status === "active") return labels.statusActive;
    if (status === "break") return labels.statusBreak;
    return labels.statusOff;
  };

  const staffTotal = data.shift_staff.length;
  const roleSummary = roleOrder
    .map((role) => {
      const count = grouped[role].length;
      if (count === 0) return null;
      return `${count} ${getRoleLabel(role, locale)}`;
    })
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="dashboard-surface overflow-hidden rounded-[1rem]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition hover:bg-white/40 sm:items-center sm:px-4"
        aria-expanded={expanded}
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.7rem] bg-[color:rgba(13,71,161,0.1)] text-[color:var(--cs-primary)] sm:mt-0">
          <UsersRound className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--cs-text-soft)]">
              {labels.title}
            </span>
            <span className="text-[11px] text-[color:var(--cs-text-soft)]">
              {labels.today}: {formatToday(data.today_date, locale)}
            </span>
          </div>
          <p className="mt-1 text-[13px] font-semibold text-[color:var(--cs-heading)]">
            {localizeText(data.shift_label, locale)}
            <span className="ml-1.5 font-medium text-[color:var(--cs-teal)]">
              {localizeText(data.shift_hours, locale)}
            </span>
          </p>
          {!expanded ? (
            <p className="mt-1 line-clamp-2 text-[12px] text-[color:var(--cs-text-soft)]">
              {staffTotal > 0 ? (
                <>
                  {staffTotal} {labels.staffOnDuty}
                  {roleSummary ? ` · ${roleSummary}` : ""}
                  <span className="mx-1.5 text-[color:var(--cs-border-strong)]">|</span>
                  {labels.patients}: {data.total_patients}
                </>
              ) : (
                labels.empty
              )}
            </p>
          ) : null}
        </div>

        <span className="flex shrink-0 items-center gap-1.5 pt-0.5 text-[11px] font-semibold text-[color:var(--cs-primary)] sm:pt-0">
          <span className="hidden sm:inline">
            {expanded ? labels.collapse : labels.expand}
          </span>
          <ChevronDown
            className={[
              "h-4 w-4 transition-transform",
              expanded ? "rotate-180" : "",
            ].join(" ")}
          />
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-white/50 px-3.5 pb-3.5 pt-2 sm:px-4">
          {data.shift_staff.length === 0 ? (
            <p className="py-3 text-center text-[12px] text-[color:var(--cs-text-soft)]">
              {labels.empty}
            </p>
          ) : (
            <div className="space-y-2.5">
              {roleOrder.map((role) => {
                const members = grouped[role];
                if (members.length === 0) return null;

                return (
                  <div key={role}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span
                        className={[
                          "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          roleAccent[role],
                        ].join(" ")}
                      >
                        {getRoleLabel(role, locale)}
                      </span>
                      <span className="text-[10px] text-[color:var(--cs-text-soft)]">
                        {members.length}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {members.map((member) => (
                        <li
                          key={member.id}
                          className="flex items-center justify-between gap-2 rounded-[0.65rem] bg-white/45 px-2.5 py-1.5 text-[12px]"
                        >
                          <span className="min-w-0 truncate font-medium text-[color:var(--cs-heading)]">
                            {member.name}
                          </span>
                          <span className="flex shrink-0 items-center gap-2 text-[11px] text-[color:var(--cs-text-soft)]">
                            <span className="hidden sm:inline">
                              {labels.zone} {getZoneLabel(member.zone_code, locale)}
                            </span>
                            <span
                              className="inline-flex items-center gap-1"
                              title={statusLabel(member.status)}
                            >
                              <span
                                className={[
                                  "h-1.5 w-1.5 rounded-full",
                                  statusDot[member.status],
                                ].join(" ")}
                              />
                              <span className="hidden sm:inline">
                                {statusLabel(member.status)}
                              </span>
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function formatToday(dateKey: string, locale: "vi" | "en") {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${dateKey}T12:00:00`));
}
