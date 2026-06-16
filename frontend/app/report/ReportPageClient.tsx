"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ClinicalShell } from "@/components/clinical/ClinicalShell";
import { ReportAlertByTypeChart } from "@/components/report/ReportAlertByTypeChart";
import { ReportAlertTrendChart } from "@/components/report/ReportAlertTrendChart";
import { ReportPatientRiskTable } from "@/components/report/ReportPatientRiskTable";
import { ReportSummaryCards } from "@/components/report/ReportSummaryCards";
import { ReportTimeRangeSelector } from "@/components/report/ReportTimeRangeSelector";
import { ReportVitalHeatmap } from "@/components/report/ReportVitalHeatmap";
import { useLocale } from "@/components/providers/LocaleProvider";
import { getDepartmentLabel } from "@/lib/i18n";
import {
  DEFAULT_CLINICIAN_DEPARTMENT,
  REPORT_DEPARTMENTS,
} from "@/lib/report/constants";
import { useReportScope } from "@/lib/report-scope";
import type {
  ReportAlertByTypeResponse,
  ReportAlertTrendResponse,
  ReportHeatmapResponse,
  ReportPatientRiskResponse,
  ReportRange,
  ReportSummaryResponse,
} from "@/lib/report/types";
import { reportRepository } from "@/lib/repositories/report.repository";

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

export default function ReportPageClient() {
  const { locale } = useLocale();
  const { isAdmin, setScope } = useReportScope();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const range = (searchParams.get("range") === "30d" ? "30d" : "7d") as ReportRange;
  const departmentParam = searchParams.get("department");
  const filterDate = searchParams.get("date");
  const sort = (searchParams.get("sort") as SortKey) || "critical_desc";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const department = isAdmin
    ? departmentParam && departmentParam !== "all"
      ? departmentParam
      : null
    : DEFAULT_CLINICIAN_DEPARTMENT;

  const [summary, setSummary] = useState<ReportSummaryResponse | null>(null);
  const [trend, setTrend] = useState<ReportAlertTrendResponse | null>(null);
  const [byType, setByType] = useState<ReportAlertByTypeResponse | null>(null);
  const [heatmap, setHeatmap] = useState<ReportHeatmapResponse | null>(null);
  const [risk, setRisk] = useState<ReportPatientRiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const departmentLabel = useMemo(() => {
    if (isAdmin && !department) {
      return locale === "vi" ? "Toàn viện" : "Hospital-wide";
    }
    return getDepartmentLabel(department ?? DEFAULT_CLINICIAN_DEPARTMENT, locale);
  }, [department, isAdmin, locale]);

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (!value) next.delete(key);
        else next.set(key, value);
      }
      router.replace(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextSummary, nextTrend, nextByType, nextHeatmap, nextRisk] =
        await Promise.all([
          reportRepository.getSummary(range, department),
          reportRepository.getAlertTrend(range, department),
          reportRepository.getAlertByType(range, department),
          reportRepository.getHeatmap(range, department),
          reportRepository.getPatientRisk({
            range,
            department,
            sort,
            page,
            date: filterDate,
          }),
        ]);
      setSummary(nextSummary);
      setTrend(nextTrend);
      setByType(nextByType);
      setHeatmap(nextHeatmap);
      setRisk(nextRisk);
    } catch (nextError: unknown) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : locale === "vi"
            ? "Không thể tải báo cáo."
            : "Unable to load report.",
      );
    } finally {
      setLoading(false);
    }
  }, [department, filterDate, locale, page, range, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const updatedLabel = useMemo(() => {
    const stamp = summary?.updated_at
      ? new Date(summary.updated_at)
      : new Date();
    return stamp.toLocaleTimeString(locale === "vi" ? "vi-VN" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [locale, summary?.updated_at]);

  return (
    <ClinicalShell
      eyebrow={locale === "vi" ? "Phân tích tổng hợp" : "Analytics"}
      title={`Report — ${departmentLabel}`}
      description={
        locale === "vi"
          ? "Tổng quan khoa trong khoảng thời gian đã chọn — không phải giám sát realtime từng bệnh nhân."
          : "Ward-level overview for the selected period — not per-patient realtime monitoring."
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={isAdmin ? "admin" : "clinician"}
            onChange={(event) => {
              const next =
                event.target.value === "admin" ? "admin" : "clinician";
              setScope(next);
              if (next === "clinician") {
                updateParams({ department: null, page: "1" });
              }
            }}
            className="dashboard-input h-9 rounded-[0.7rem] px-2 text-[11px] font-semibold"
            aria-label={locale === "vi" ? "Phạm vi báo cáo" : "Report scope"}
          >
            <option value="clinician">
              {locale === "vi" ? "Bác sĩ / Y tá" : "Clinician"}
            </option>
            <option value="admin">
              {locale === "vi" ? "Quản trị" : "Admin"}
            </option>
          </select>
          {isAdmin ? (
            <select
              value={departmentParam ?? "all"}
              onChange={(event) =>
                updateParams({
                  department:
                    event.target.value === "all" ? null : event.target.value,
                  page: "1",
                })
              }
              className="dashboard-input h-9 rounded-[0.7rem] px-2 text-[12px] font-semibold"
            >
              <option value="all">
                {locale === "vi" ? "Tất cả khoa" : "All departments"}
              </option>
              {REPORT_DEPARTMENTS.map((code) => (
                <option key={code} value={code}>
                  {getDepartmentLabel(code, locale)}
                </option>
              ))}
            </select>
          ) : null}
          <ReportTimeRangeSelector
            range={range}
            locale={locale}
            onChange={(nextRange) =>
              updateParams({ range: nextRange, page: "1", date: null })
            }
          />
          <span className="text-[11px] text-[color:var(--cs-text-soft)]">
            {locale === "vi" ? "Cập nhật:" : "Updated:"} {updatedLabel}
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        {error ? (
          <div className="rounded-[0.85rem] border border-[color:rgba(229,72,77,0.22)] bg-[color:rgba(229,72,77,0.08)] px-4 py-3 text-[12px] text-[color:var(--cs-danger)]">
            {error}
          </div>
        ) : null}

        <ReportSummaryCards summary={summary} loading={loading} locale={locale} />

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <ReportAlertTrendChart
              data={trend}
              loading={loading}
              locale={locale}
              selectedDate={filterDate}
              onSelectDate={(date) => updateParams({ date, page: "1" })}
            />
          </div>
          <div className="xl:col-span-1">
            <ReportAlertByTypeChart
              data={byType}
              loading={loading}
              locale={locale}
            />
          </div>
        </div>

        <ReportVitalHeatmap data={heatmap} loading={loading} locale={locale} />

        <ReportPatientRiskTable
          data={risk}
          loading={loading}
          locale={locale}
          sort={sort}
          onSortChange={(nextSort) => updateParams({ sort: nextSort, page: "1" })}
          page={page}
          onPageChange={(nextPage) => updateParams({ page: String(nextPage) })}
          showDepartment={isAdmin && !department}
          filterDate={filterDate}
          onClearDateFilter={() => updateParams({ date: null, page: "1" })}
        />
      </div>
    </ClinicalShell>
  );
}
