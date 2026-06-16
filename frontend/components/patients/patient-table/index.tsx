"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { PatientStatus } from "@/types";
import { PatientCard, type PatientListItem } from "../patient-card";
import { PatientSearch } from "../patient-search";

type PatientTableProps = {
  items: PatientListItem[];
  fillHeight?: boolean;
};

type FilterValue = "all" | "critical" | "warning" | "normal";

const statusPriority: Record<PatientStatus, number> = {
  critical: 0,
  at_risk: 1,
  recent_symptom: 1,
  healthy: 2,
};

export function PatientTable({ items, fillHeight = false }: PatientTableProps) {
  const { locale } = useLocale();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const deferredQuery = useDeferredValue(query).trim().toLowerCase();

  const visibleItems = useMemo(
    () =>
      [...items]
        .sort((a, b) => {
          const statusDiff =
            statusPriority[a.patient.status] - statusPriority[b.patient.status];
          if (statusDiff !== 0) return statusDiff;
          return b.openAlertCount - a.openAlertCount;
        })
        .filter((item) => {
          const matchesQuery =
            !deferredQuery ||
            [item.patient.name, item.patient.mrn, item.patient.id].some((value) =>
              value.toLowerCase().includes(deferredQuery),
            );
          const matchesFilter =
            filter === "all" ||
            (filter === "critical" && item.patient.status === "critical") ||
            (filter === "warning" &&
              ["at_risk", "recent_symptom"].includes(item.patient.status)) ||
            (filter === "normal" && item.patient.status === "healthy");
          return matchesQuery && matchesFilter;
        }),
    [deferredQuery, filter, items],
  );

  const filters: Array<{ value: FilterValue; label: string }> = [
    { value: "all", label: locale === "vi" ? "Tất cả" : "All" },
    { value: "critical", label: locale === "vi" ? "Nguy kịch" : "Critical" },
    { value: "warning", label: locale === "vi" ? "Cần chú ý" : "Warning" },
    { value: "normal", label: locale === "vi" ? "Bình thường" : "Normal" },
  ];

  return (
    <div
      className={fillHeight ? "flex min-h-0 flex-1 flex-col gap-2.5" : "space-y-2.5"}
    >
      <div
        className={[
          "dashboard-surface rounded-[1.15rem] p-3",
          fillHeight ? "shrink-0" : "sticky top-0 z-20",
        ].join(" ")}
      >
        <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <PatientSearch value={query} onChange={setQuery} />
          <div className="flex flex-wrap gap-1.5">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={[
                  "h-9 rounded-[0.7rem] border px-3 text-[12px] font-semibold transition",
                  filter === item.value
                    ? "border-transparent bg-[linear-gradient(135deg,var(--cs-primary),var(--cs-teal))] text-white shadow-[0_12px_28px_rgba(13,71,161,0.18)]"
                    : "dashboard-input text-[color:var(--cs-text)] hover:border-white/80 hover:bg-white/74",
                ].join(" ")}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className={
          fillHeight
            ? "dashboard-scroll-area min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
            : "space-y-2"
        }
      >
        {visibleItems.length ? (
          visibleItems.map((item) => <PatientCard key={item.patient.id} item={item} />)
        ) : (
          <div className="dashboard-surface rounded-[1.15rem] px-4 py-8 text-center text-[13px] text-[color:var(--cs-text-soft)]">
            {locale === "vi"
              ? "Không có bệnh nhân phù hợp với bộ lọc."
              : "No patients match the current filters."}
          </div>
        )}
      </div>
    </div>
  );
}
