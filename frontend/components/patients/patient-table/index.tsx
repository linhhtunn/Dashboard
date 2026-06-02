"use client";

import { useDeferredValue, useMemo, useState } from "react";
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

const summaryStatuses: Array<{
  label: string;
  status?: PatientStatus;
}> = [
  { label: "Total Patients" },
  { label: "Healthy", status: "healthy" },
  { label: "At Risk", status: "at_risk" },
  { label: "Critical", status: "critical" },
];

const summaryAccentClasses: Record<"total" | PatientStatus, string> = {
  total: "bg-primary",
  healthy: "bg-teal-600",
  at_risk: "bg-amber-500",
  critical: "bg-red-600",
  recent_symptom: "bg-blue-700",
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

  const summary = useMemo<Array<{ label: string; count: number; status?: PatientStatus }>>(
    () =>
      summaryStatuses.map((summaryStatus) => ({
        label: summaryStatus.label,
        count: summaryStatus.status
          ? items.filter((item) => item.patient.status === summaryStatus.status)
              .length
          : items.length,
      })),
    [items],
  );

  const emptyMessage = trimmedQuery
    ? "No patients found"
    : "No patients match this filter";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((item) => (
          <article
            key={item.label}
            className="rounded-lg border border-border bg-panel p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-text-body">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold text-text-strong">
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

      <div className="space-y-6 pb-2">
        <PatientSearch value={query} onChange={setQuery} />
        <PatientStatusFilter value={status} onChange={setStatus} />
      </div>

      <div className="space-y-3">
        {visibleItems.length > 0 ? (
          visibleItems.map((item) => (
            <PatientCard key={item.patient.id} item={item} />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-panel px-4 py-10 text-center">
            <p className="text-sm font-medium text-text-strong">
              {emptyMessage}
            </p>
            <p className="mt-1 text-sm text-text-body">
              Adjust search or status filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
