"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { ReportHeatmapLevel, ReportHeatmapResponse } from "@/lib/report/types";

type ReportHeatmapProps = {
  data: ReportHeatmapResponse | null;
  loading: boolean;
  title: string;
  labels: { patient: string; legendCritical: string; legendWarning: string; legendNormal: string };
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
};

const levelStyles: Record<ReportHeatmapLevel, string> = {
  critical: "bg-[color:rgba(229,72,77,0.82)]",
  warning: "bg-[color:rgba(245,179,0,0.78)]",
  normal: "bg-[color:rgba(0,150,136,0.35)]",
};

function weekdayLabel(date: string, locale: "vi" | "en") {
  const day = new Date(`${date}T00:00:00`).getDay();
  if (locale === "vi") {
    return ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][day];
  }
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day];
}

export function ReportHeatmap({
  data,
  loading,
  title,
  labels,
  selectedDate = null,
  onSelectDate,
}: ReportHeatmapProps) {
  const { locale } = useLocale();

  if (loading || !data) {
    return <div className="dashboard-surface h-[320px] animate-pulse rounded-[1rem]" />;
  }

  if (!data.rows.length) {
    return (
      <section className="dashboard-surface rounded-[1rem] px-4 py-6 text-center text-[12px] text-[color:var(--cs-text-soft)]">
        {locale === "vi"
          ? "Chưa có bệnh nhân nào được theo dõi."
          : "No patients are being monitored."}
      </section>
    );
  }

  return (
    <section className="dashboard-surface overflow-hidden rounded-[1rem] px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold text-[color:var(--cs-heading)]">
          {title}
        </h2>
        <div className="flex flex-wrap gap-3 text-[10px] text-[color:var(--cs-text-soft)]">
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${levelStyles.critical}`} />
            {labels.legendCritical}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${levelStyles.warning}`} />
            {labels.legendWarning}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${levelStyles.normal}`} />
            {labels.legendNormal}
          </span>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-1 text-left">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[color:rgba(255,255,255,0.92)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cs-text-soft)]">
                {labels.patient}
              </th>
              {data.dates.map((date) => (
                <th
                  key={date}
                  className={[
                    "px-1 py-1 text-center text-[10px] font-semibold",
                    selectedDate === date
                      ? "text-[color:var(--cs-primary)]"
                      : "text-[color:var(--cs-text-soft)]",
                  ].join(" ")}
                >
                  {weekdayLabel(date, locale)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.patient_id}>
                <td className="sticky left-0 z-10 bg-[color:rgba(255,255,255,0.92)] px-2 py-1 text-[11px] font-medium text-[color:var(--cs-heading)]">
                  {row.patient_name}
                </td>
                {row.days.map((day) => (
                  <td key={`${row.patient_id}-${day.date}`} className="p-0.5">
                    <button
                      type="button"
                      title={
                        locale === "vi"
                          ? `${day.total_count} cảnh báo — ${day.critical_count} critical, ${day.warning_count} warning`
                          : `${day.total_count} alerts — ${day.critical_count} critical, ${day.warning_count} warning`
                      }
                      onClick={() => onSelectDate?.(day.date)}
                      className={[
                        "flex h-7 w-7 items-center justify-center rounded-[0.45rem] transition hover:scale-105 hover:ring-2 hover:ring-[color:rgba(13,71,161,0.25)]",
                        levelStyles[day.level],
                        selectedDate === day.date
                          ? "ring-2 ring-[color:var(--cs-primary)]"
                          : "",
                      ].join(" ")}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
