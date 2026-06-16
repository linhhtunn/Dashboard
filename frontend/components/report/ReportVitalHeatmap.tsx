"use client";

import { useRouter } from "next/navigation";

import type { HeatmapLevel, ReportHeatmapResponse } from "@/lib/report/types";

type ReportVitalHeatmapProps = {
  data: ReportHeatmapResponse | null;
  loading?: boolean;
  locale: "vi" | "en";
};

const levelStyles: Record<
  HeatmapLevel,
  { bg: string; label: string; emoji: string }
> = {
  critical: {
    bg: "bg-[color:rgba(229,72,77,0.82)]",
    label: "Critical",
    emoji: "🔴",
  },
  warning: {
    bg: "bg-[color:rgba(245,179,0,0.78)]",
    label: "Warning",
    emoji: "🟡",
  },
  normal: {
    bg: "bg-[color:rgba(0,150,136,0.55)]",
    label: "Normal",
    emoji: "🟢",
  },
};

export function ReportVitalHeatmap({
  data,
  loading = false,
  locale,
}: ReportVitalHeatmapProps) {
  const router = useRouter();

  if (loading || !data) {
    return (
      <section className="dashboard-surface min-h-[260px] animate-pulse rounded-[1rem] bg-white/50 p-4" />
    );
  }

  const dayLabels = data.dates.map((date) =>
    new Date(`${date}T12:00:00`).toLocaleDateString(
      locale === "vi" ? "vi-VN" : "en-US",
      { weekday: "short" },
    ),
  );

  return (
    <section className="dashboard-surface rounded-[1rem] p-4">
      <header className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-semibold text-[color:var(--cs-heading)]">
            {locale === "vi"
              ? "Heatmap bất thường sinh hiệu"
              : "Vital anomaly heatmap"}
          </h2>
          <p className="text-[11px] text-[color:var(--cs-text-soft)]">
            {locale === "vi"
              ? "Bệnh nhân × ngày — nhấn ô để mở hồ sơ"
              : "Patient × day — click a cell to open chart"}
          </p>
        </div>
        <div className="flex gap-2 text-[10px] text-[color:var(--cs-text-soft)]">
          {(["critical", "warning", "normal"] as HeatmapLevel[]).map((level) => (
            <span key={level} className="inline-flex items-center gap-1">
              <span>{levelStyles[level].emoji}</span>
              {levelStyles[level].label}
            </span>
          ))}
        </div>
      </header>

      {data.patients.length === 0 ? (
        <p className="rounded-[0.8rem] bg-white/45 px-4 py-8 text-center text-[12px] text-[color:var(--cs-text-soft)]">
          {locale === "vi"
            ? "Chưa có bệnh nhân nào được theo dõi"
            : "No patients are being monitored"}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-1 text-left">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[140px] bg-[color:rgba(255,255,255,0.92)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--cs-text-soft)]">
                  {locale === "vi" ? "Bệnh nhân" : "Patient"}
                </th>
                {dayLabels.map((label, index) => (
                  <th
                    key={`${label}-${index}`}
                    className="px-1 py-1 text-center text-[10px] font-semibold text-[color:var(--cs-text-soft)]"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.patients.map((row) => (
                <tr key={row.patient_id}>
                  <td className="sticky left-0 z-10 bg-[color:rgba(255,255,255,0.92)] px-2 py-1 text-[11px] font-medium text-[color:var(--cs-heading)]">
                    {row.patient_name}
                  </td>
                  {row.days.map((day) => {
                    const style = levelStyles[day.level];
                    return (
                      <td key={`${row.patient_id}-${day.date}`} className="p-0.5">
                        <button
                          type="button"
                          title={
                            locale === "vi"
                              ? `${day.total} cảnh báo — ${day.critical} critical, ${day.warning} warning`
                              : `${day.total} alerts — ${day.critical} critical, ${day.warning} warning`
                          }
                          onClick={() =>
                            router.push(
                              `/patients/${row.patient_id}?date=${day.date}`,
                            )
                          }
                          className={[
                            "flex h-8 w-8 items-center justify-center rounded-[0.45rem] text-[11px] transition hover:scale-105 hover:ring-2 hover:ring-[color:rgba(13,71,161,0.25)]",
                            style.bg,
                          ].join(" ")}
                        >
                          <span aria-hidden>{style.emoji}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
