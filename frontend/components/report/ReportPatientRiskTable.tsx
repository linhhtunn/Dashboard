"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { getDepartmentLabel, getPatientStatusLabel } from "@/lib/i18n";
import type { ReportPatientRiskResponse } from "@/lib/report/types";

type SortKey =
  | "critical_desc"
  | "critical_asc"
  | "total_desc"
  | "total_asc"
  | "patient_asc"
  | "spo2_asc"
  | "spo2_desc"
  | "hr_asc"
  | "hr_desc"
  | "status";

type ReportPatientRiskTableProps = {
  data: ReportPatientRiskResponse | null;
  loading?: boolean;
  locale: "vi" | "en";
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  page: number;
  onPageChange: (page: number) => void;
  showDepartment?: boolean;
  filterDate?: string | null;
  onClearDateFilter?: () => void;
};

export function ReportPatientRiskTable({
  data,
  loading = false,
  locale,
  sort,
  onSortChange,
  page,
  onPageChange,
  showDepartment = false,
  filterDate,
  onClearDateFilter,
}: ReportPatientRiskTableProps) {
  if (loading || !data) {
    return (
      <section className="dashboard-surface min-h-[320px] animate-pulse rounded-[1rem] bg-white/50 p-4" />
    );
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.page_size));

  return (
    <section className="dashboard-surface rounded-[1rem] p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-semibold text-[color:var(--cs-heading)]">
            {locale === "vi" ? "Bảng rủi ro bệnh nhân" : "Patient risk table"}
          </h2>
          {filterDate ? (
            <button
              type="button"
              onClick={onClearDateFilter}
              className="mt-1 text-[11px] font-medium text-[color:var(--cs-primary)]"
            >
              {locale === "vi"
                ? `Đang lọc ngày ${filterDate} · Bỏ lọc`
                : `Filtered by ${filterDate} · Clear`}
            </button>
          ) : null}
        </div>
        <p className="text-[11px] text-[color:var(--cs-text-soft)]">
          {data.total} {locale === "vi" ? "bệnh nhân" : "patients"}
        </p>
      </header>

      {data.patients.length === 0 ? (
        <p className="rounded-[0.8rem] bg-white/45 px-4 py-8 text-center text-[12px] text-[color:var(--cs-text-soft)]">
          {locale === "vi"
            ? "Không có bệnh nhân nào trong bộ lọc hiện tại"
            : "No patients match the current filters"}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-[color:var(--cs-border)] text-[10px] uppercase tracking-[0.08em] text-[color:var(--cs-text-soft)]">
                  <SortHeader
                    label={locale === "vi" ? "Bệnh nhân" : "Patient"}
                    active={sort === "patient_asc"}
                    onClick={() => onSortChange("patient_asc")}
                  />
                  {showDepartment ? (
                    <th className="px-2 py-2 font-semibold">
                      {locale === "vi" ? "Khoa" : "Dept"}
                    </th>
                  ) : null}
                  <SortHeader
                    label={locale === "vi" ? "Tổng alert" : "Total alerts"}
                    active={sort === "total_desc" || sort === "total_asc"}
                    onClick={() =>
                      onSortChange(sort === "total_desc" ? "total_asc" : "total_desc")
                    }
                  />
                  <SortHeader
                    label="Critical"
                    active={sort === "critical_desc" || sort === "critical_asc"}
                    onClick={() =>
                      onSortChange(
                        sort === "critical_desc" ? "critical_asc" : "critical_desc",
                      )
                    }
                  />
                  <th className="px-2 py-2 font-semibold">
                    {locale === "vi" ? "Chỉ số bất thường" : "Top metric"}
                  </th>
                  <SortHeader
                    label={locale === "vi" ? "SpO₂ TB" : "Avg SpO₂"}
                    active={sort === "spo2_desc" || sort === "spo2_asc"}
                    onClick={() =>
                      onSortChange(sort === "spo2_desc" ? "spo2_asc" : "spo2_desc")
                    }
                  />
                  <SortHeader
                    label={locale === "vi" ? "HR TB" : "Avg HR"}
                    active={sort === "hr_desc" || sort === "hr_asc"}
                    onClick={() =>
                      onSortChange(sort === "hr_desc" ? "hr_asc" : "hr_desc")
                    }
                  />
                  <SortHeader
                    label={locale === "vi" ? "Trạng thái" : "Status"}
                    active={sort === "status"}
                    onClick={() => onSortChange("status")}
                  />
                  <th className="px-2 py-2 font-semibold">
                    {locale === "vi" ? "Hồ sơ" : "Chart"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.patients.map((row) => (
                  <tr
                    key={row.patient_id}
                    className="border-b border-[color:rgba(13,71,161,0.06)] text-[color:var(--cs-text)]"
                  >
                    <td className="px-2 py-2.5">
                      <p className="font-semibold text-[color:var(--cs-heading)]">
                        {row.patient_name}
                      </p>
                      <p className="text-[10px] text-[color:var(--cs-text-soft)]">
                        {row.age} {locale === "vi" ? "tuổi" : "yrs"}
                        {row.bed ? ` · ${row.bed}` : ""}
                      </p>
                    </td>
                    {showDepartment ? (
                      <td className="px-2 py-2.5 text-[11px]">
                        {row.department_code
                          ? getDepartmentLabel(row.department_code, locale)
                          : "—"}
                      </td>
                    ) : null}
                    <td className="px-2 py-2.5 font-medium">{row.total_alerts}</td>
                    <td className="px-2 py-2.5 font-semibold text-[color:var(--cs-danger)]">
                      {row.critical_alerts}
                    </td>
                    <td className="px-2 py-2.5">{row.top_metric}</td>
                    <td className="px-2 py-2.5">
                      {row.avg_spo2 !== null ? `${row.avg_spo2}%` : "—"}
                    </td>
                    <td className="px-2 py-2.5">
                      {row.avg_hr !== null ? `${row.avg_hr} bpm` : "—"}
                    </td>
                    <td className="px-2 py-2.5">
                      {getPatientStatusLabel(row.status, locale)}
                    </td>
                    <td className="px-2 py-2.5">
                      <Link
                        href={`/patients/${row.patient_id}`}
                        className="font-semibold text-[color:var(--cs-primary)] hover:underline"
                      >
                        {locale === "vi" ? "Xem" : "Open"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="dashboard-input inline-flex h-8 items-center gap-1 rounded-[0.65rem] px-2 text-[11px] disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              {locale === "vi" ? "Trước" : "Prev"}
            </button>
            <span className="text-[11px] text-[color:var(--cs-text-soft)]">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="dashboard-input inline-flex h-8 items-center gap-1 rounded-[0.65rem] px-2 text-[11px] disabled:opacity-40"
            >
              {locale === "vi" ? "Sau" : "Next"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function SortHeader({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <th className="px-2 py-2">
      <button
        type="button"
        onClick={onClick}
        className={[
          "font-semibold uppercase tracking-[0.08em]",
          active ? "text-[color:var(--cs-primary)]" : "text-[color:var(--cs-text-soft)]",
        ].join(" ")}
      >
        {label}
      </button>
    </th>
  );
}
