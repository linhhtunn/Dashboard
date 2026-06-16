"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { getPatientStatusLabel } from "@/lib/i18n";
import { localizeText } from "@/lib/i18n";
import type { ReportPatientRiskResponse } from "@/lib/report/types";

type ReportPatientRiskTableProps = {
  data: ReportPatientRiskResponse | null;
  loading: boolean;
  sort: string;
  filterDate: string | null;
  onSort: (sort: string) => void;
  onPage: (page: number) => void;
  onClearFilter: () => void;
  showDepartment?: boolean;
  title: string;
  labels: {
    patient: string;
    totalAlerts: string;
    critical: string;
    topMetric: string;
    avgSpo2: string;
    avgHr: string;
    status: string;
    view: string;
    department: string;
    clearFilter: string;
    page: string;
  };
};

export function ReportPatientRiskTable({
  data,
  loading,
  sort,
  filterDate,
  onSort,
  onPage,
  onClearFilter,
  showDepartment = false,
  title,
  labels,
}: ReportPatientRiskTableProps) {
  const { locale } = useLocale();

  if (loading || !data) {
    return <div className="dashboard-surface h-[360px] animate-pulse rounded-[1rem]" />;
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.page_size));

  return (
    <section className="dashboard-surface overflow-hidden rounded-[1rem]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--cs-border)] px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold text-[color:var(--cs-heading)]">
            {title}
          </h2>
          {filterDate ? (
            <button
              type="button"
              onClick={onClearFilter}
              className="mt-1 text-[10px] font-medium text-[color:var(--cs-primary)]"
            >
              {labels.clearFilter}: {filterDate}
            </button>
          ) : null}
        </div>
        <p className="text-[10px] text-[color:var(--cs-text-soft)]">
          {data.total} {locale === "vi" ? "bệnh nhân" : "patients"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-[12px]">
          <thead className="bg-[color:rgba(13,71,161,0.04)] text-[10px] uppercase tracking-wide text-[color:var(--cs-text-soft)]">
            <tr>
              <th className="px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => onSort("critical_desc")}
                  className={[
                    "font-semibold",
                    sort === "critical_desc"
                      ? "text-[color:var(--cs-primary)]"
                      : "hover:text-[color:var(--cs-heading)]",
                  ].join(" ")}
                >
                  {labels.patient}
                </button>
              </th>
              {showDepartment ? (
                <th className="px-3 py-2.5">{labels.department}</th>
              ) : null}
              <th className="px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => onSort("total_alerts_desc")}
                  className={[
                    "font-semibold",
                    sort === "total_alerts_desc"
                      ? "text-[color:var(--cs-primary)]"
                      : "hover:text-[color:var(--cs-heading)]",
                  ].join(" ")}
                >
                  {labels.totalAlerts}
                </button>
              </th>
              <th className="px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => onSort("critical_desc")}
                  className={[
                    "font-semibold",
                    sort === "critical_desc"
                      ? "text-[color:var(--cs-primary)]"
                      : "hover:text-[color:var(--cs-heading)]",
                  ].join(" ")}
                >
                  {labels.critical}
                </button>
              </th>
              <th className="px-3 py-2.5">{labels.topMetric}</th>
              <th className="px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => onSort("spo2_asc")}
                  className={[
                    "font-semibold",
                    sort === "spo2_asc"
                      ? "text-[color:var(--cs-primary)]"
                      : "hover:text-[color:var(--cs-heading)]",
                  ].join(" ")}
                >
                  {labels.avgSpo2}
                </button>
              </th>
              <th className="px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => onSort("hr_desc")}
                  className={[
                    "font-semibold",
                    sort === "hr_desc"
                      ? "text-[color:var(--cs-primary)]"
                      : "hover:text-[color:var(--cs-heading)]",
                  ].join(" ")}
                >
                  {labels.avgHr}
                </button>
              </th>
              <th className="px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => onSort("status")}
                  className={[
                    "font-semibold",
                    sort === "status"
                      ? "text-[color:var(--cs-primary)]"
                      : "hover:text-[color:var(--cs-heading)]",
                  ].join(" ")}
                >
                  {labels.status}
                </button>
              </th>
              <th className="px-3 py-2.5">{labels.view}</th>
            </tr>
          </thead>
          <tbody>
            {data.patients.length === 0 ? (
              <tr>
                <td
                  colSpan={showDepartment ? 9 : 8}
                  className="px-4 py-8 text-center text-[color:var(--cs-text-soft)]"
                >
                  {locale === "vi"
                    ? "Không có bệnh nhân phù hợp bộ lọc."
                    : "No patients match the current filter."}
                </td>
              </tr>
            ) : (
              data.patients.map((row) => (
                <tr
                  key={row.patient_id}
                  className="border-t border-[color:var(--cs-border)] hover:bg-[color:rgba(13,71,161,0.03)]"
                >
                  <td className="px-3 py-3">
                    <p className="font-semibold text-[color:var(--cs-heading)]">
                      {row.patient_name}
                    </p>
                    <p className="text-[10px] text-[color:var(--cs-text-soft)]">
                      {row.age}
                      {locale === "vi" ? " tuổi" : "y"} · {row.bed ?? "—"}
                    </p>
                  </td>
                  {showDepartment ? (
                    <td className="px-3 py-3 text-[11px]">
                      {localizeText(row.department_label, locale)}
                    </td>
                  ) : null}
                  <td className="px-3 py-3 font-medium">{row.total_alerts}</td>
                  <td className="px-3 py-3 font-semibold text-[color:var(--cs-danger)]">
                    {row.critical_alerts}
                  </td>
                  <td className="px-3 py-3">{row.top_metric}</td>
                  <td className="px-3 py-3">
                    {row.avg_spo2 !== null ? `${row.avg_spo2}%` : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {row.avg_hr !== null ? `${row.avg_hr} bpm` : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {getPatientStatusLabel(row.status, locale)}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/patients/${row.patient_id}`}
                      className="text-[11px] font-semibold text-[color:var(--cs-primary)]"
                    >
                      {labels.view}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-[color:var(--cs-border)] px-4 py-3">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => onPage(data.page - 1)}
            className="dashboard-input inline-flex h-8 items-center gap-1 rounded-[0.65rem] px-2 text-[11px] disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            {locale === "vi" ? "Trước" : "Prev"}
          </button>
          <span className="text-[11px] text-[color:var(--cs-text-soft)]">
            {labels.page} {data.page}/{totalPages}
          </span>
          <button
            type="button"
            disabled={data.page >= totalPages}
            onClick={() => onPage(data.page + 1)}
            className="dashboard-input inline-flex h-8 items-center gap-1 rounded-[0.65rem] px-2 text-[11px] disabled:opacity-40"
          >
            {locale === "vi" ? "Sau" : "Next"}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function ReportPatientRiskTableAdminColumn({
  departmentLabel,
}: {
  departmentLabel: { vi: string; en: string };
}) {
  const { locale } = useLocale();
  return <>{localizeText(departmentLabel, locale)}</>;
}
