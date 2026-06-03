"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { getPatientStatusLabel } from "@/lib/i18n";
import type { PatientStatus } from "@/types";
import { PatientCard, type PatientListItem } from "../patient-card";
import { PatientSearch } from "../patient-search";
import {
  PatientStatusFilter,
  type PatientStatusFilterValue,
} from "../patient-status-filter";

type PatientTableProps = {
  items: PatientListItem[];
};

const statusPriority: Record<PatientStatus, number> = {
  critical: 0,
  at_risk: 1,
  recent_symptom: 2,
  healthy: 3,
};

const summaryAccentClasses: Record<"total" | PatientStatus, string> = {
  total: "bg-[color:var(--cs-primary)]",
  healthy: "bg-[color:var(--cs-teal)]",
  at_risk: "bg-[color:var(--cs-gold)]",
  critical: "bg-[color:var(--cs-danger)]",
  recent_symptom: "bg-[color:var(--cs-aqua)]",
};

function sortByPriority(items: PatientListItem[]) {
  return [...items].sort((a, b) => {
    const priorityDiff =
      statusPriority[a.patient.status] - statusPriority[b.patient.status];

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return (
      new Date(b.patient.lastUpdated).getTime() -
      new Date(a.patient.lastUpdated).getTime()
    );
  });
}

function matchesSearch(item: PatientListItem, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [item.patient.name, item.patient.mrn, item.patient.id].some((value) =>
    value.toLowerCase().includes(normalizedQuery),
  );
}

export function PatientTable({ items }: PatientTableProps) {
  const { locale } = useLocale();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PatientStatusFilterValue>("all");
  const deferredQuery = useDeferredValue(query);
  const trimmedQuery = deferredQuery.trim();

  const sortedItems = useMemo(() => sortByPriority(items), [items]);
  const visibleItems = useMemo(
    () =>
      sortedItems.filter((item) => {
        const statusMatches =
          status === "all" || item.patient.status === status;

        return statusMatches && matchesSearch(item, deferredQuery);
      }),
    [deferredQuery, sortedItems, status],
  );

  const summaryStatuses: Array<{
    label: string;
    status?: PatientStatus;
  }> = useMemo(
    () => [
      { label: locale === "vi" ? "Tổng bệnh nhân" : "Total patients" },
      { label: getPatientStatusLabel("healthy", locale), status: "healthy" },
      { label: getPatientStatusLabel("at_risk", locale), status: "at_risk" },
      { label: getPatientStatusLabel("critical", locale), status: "critical" },
    ],
    [locale],
  );

  const summary = useMemo<
    Array<{ label: string; count: number; status?: PatientStatus }>
  >(
    () =>
      summaryStatuses.map((summaryStatus) => ({
        label: summaryStatus.label,
        count: summaryStatus.status
          ? items.filter((item) => item.patient.status === summaryStatus.status)
              .length
          : items.length,
        status: summaryStatus.status,
      })),
    [items, summaryStatuses],
  );

  const emptyMessage = trimmedQuery
    ? locale === "vi"
      ? "Không tìm thấy bệnh nhân phù hợp"
      : "No matching patients found"
    : locale === "vi"
      ? "Không có bệnh nhân khớp bộ lọc hiện tại"
      : "No patients match the current filters";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="sticky top-0 z-20 space-y-3 bg-[linear-gradient(180deg,rgba(242,245,248,0.98)_0%,rgba(242,245,248,0.9)_78%,rgba(242,245,248,0)_100%)] pb-3 backdrop-blur-sm">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_150px]">
          <PatientSearch value={query} onChange={setQuery} />
          <button
            type="button"
            className="dashboard-input inline-flex h-12 items-center justify-center rounded-full bg-white/72 px-4 text-sm font-medium text-[color:var(--cs-heading)]"
          >
            {locale === "vi" ? "Bộ lọc" : "Filters"}
          </button>
        </div>

        <PatientStatusFilter value={status} onChange={setStatus} />

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {summary.map((item) => (
            <article
              key={item.label}
              className="dashboard-surface rounded-[1.15rem] px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.82rem] text-[color:var(--cs-text-soft)]">
                    {item.label}
                  </p>
                  <p className="mt-1.5 text-[1.7rem] font-semibold text-[color:var(--cs-heading)]">
                    {item.count}
                  </p>
                </div>
                <span
                  className={[
                    "mt-1 h-2.5 w-2.5 rounded-full",
                    summaryAccentClasses[item.status ?? "total"],
                  ].join(" ")}
                  aria-hidden="true"
                />
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {visibleItems.length > 0 ? (
          visibleItems.map((item) => <PatientCard key={item.patient.id} item={item} />)
        ) : (
          <div className="dashboard-surface rounded-[1.15rem] px-4 py-8 text-center">
            <p className="text-base font-semibold text-[color:var(--cs-heading)]">
              {emptyMessage}
            </p>
            <p className="mt-2 text-sm text-[color:var(--cs-text-soft)]">
              {locale === "vi"
                ? "Hãy thử điều chỉnh từ khóa tìm kiếm hoặc bộ lọc trạng thái."
                : "Try adjusting the search keyword or the status filters."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
