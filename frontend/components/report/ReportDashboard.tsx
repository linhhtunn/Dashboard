"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  formatReportUpdatedAt,
  localizeDepartmentLabel,
  ReportSummaryCards,
} from "@/components/report/ReportSummaryCards";
import { ReportAlertByTypeChart } from "@/components/report/ReportAlertByTypeChart";
import { ReportHeatmap } from "@/components/report/ReportHeatmap";
import { ReportInsightsPanel } from "@/components/report/ReportInsightsPanel";
import { ReportShiftDutyPanel } from "@/components/report/ReportShiftDutyPanel";
import { ReportPatientRiskTable } from "@/components/report/ReportPatientRiskTable";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import { getDepartmentLabel } from "@/lib/i18n/domain";
import {
  DEFAULT_REPORT_DEPARTMENT,
  REPORT_DEPARTMENTS,
} from "@/lib/report/constants";
import { reportRepository } from "@/lib/repositories/report.repository";
import type {
  ReportAlertByTypeResponse,
  ReportHeatmapResponse,
  ReportInsightsResponse,
  ReportOverviewResponse,
  ReportPatientRiskResponse,
  ReportRangeKey,
  ReportSummaryResponse,
} from "@/lib/report/types";

const ADMIN_STORAGE_KEY = "caresignal-report-admin";

export function ReportDashboard() {
  const { locale } = useLocale();
  const ui = useClinicalUi();
  const router = useRouter();
  const searchParams = useSearchParams();

  const range = (searchParams.get("range") === "30d" ? "30d" : "7d") as ReportRangeKey;
  const departmentParam = searchParams.get("department");
  const filterDate = searchParams.get("filter_date");
  const sort = searchParams.get("sort") ?? "critical_desc";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [adminMode, setAdminMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<ReportOverviewResponse | null>(null);
  const [summary, setSummary] = useState<ReportSummaryResponse | null>(null);
  const [insights, setInsights] = useState<ReportInsightsResponse | null>(null);
  const [byType, setByType] = useState<ReportAlertByTypeResponse | null>(null);
  const [heatmap, setHeatmap] = useState<ReportHeatmapResponse | null>(null);
  const [patientRisk, setPatientRisk] = useState<ReportPatientRiskResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAdminMode(window.localStorage.getItem(ADMIN_STORAGE_KEY) === "1");
  }, []);

  const department = useMemo(() => {
    if (adminMode) {
      return departmentParam && REPORT_DEPARTMENTS.includes(departmentParam as (typeof REPORT_DEPARTMENTS)[number])
        ? departmentParam
        : "all";
    }
    return departmentParam ?? DEFAULT_REPORT_DEPARTMENT;
  }, [adminMode, departmentParam]);

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      router.replace(`/report?${params.toString()}`);
    },
    [router, searchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const base = { range, department };
      const [
        nextOverview,
        nextSummary,
        nextInsights,
        nextByType,
        nextHeatmap,
        nextPatientRisk,
      ] = await Promise.all([
        reportRepository.getOverview(base),
        reportRepository.getSummary(base),
        reportRepository.getInsights(base),
        reportRepository.getAlertByType(base),
        reportRepository.getHeatmap(base),
        reportRepository.getPatientRisk({
          ...base,
          sort,
          page,
          filter_date: filterDate,
        }),
      ]);
      setOverview(nextOverview);
      setSummary(nextSummary);
      setInsights(nextInsights);
      setByType(nextByType);
      setHeatmap(nextHeatmap);
      setPatientRisk(nextPatientRisk);
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

  const departmentTitle = summary
    ? localizeDepartmentLabel(summary, locale)
    : getDepartmentLabel(department === "all" ? "cardiology" : department, locale);

  const toggleAdmin = () => {
    const next = !adminMode;
    setAdminMode(next);
    window.localStorage.setItem(ADMIN_STORAGE_KEY, next ? "1" : "0");
    updateParams({
      department: next ? "all" : DEFAULT_REPORT_DEPARTMENT,
      page: null,
      filter_date: null,
    });
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--cs-teal)]">
            {ui.report.eyebrow}
          </p>
          <h1 className="mt-1 text-[1.35rem] font-semibold tracking-[-0.025em] text-[color:var(--cs-heading)] sm:text-[1.6rem]">
            {ui.report.title} — {departmentTitle}
          </h1>
          {summary ? (
            <p className="mt-1 text-[11px] text-[color:var(--cs-text-soft)]">
              {ui.report.updated}: {formatReportUpdatedAt(summary.updated_at, locale)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {adminMode ? (
            <select
              value={department}
              onChange={(event) =>
                updateParams({ department: event.target.value, page: null })
              }
              className="dashboard-input h-9 rounded-[0.7rem] px-2 text-[12px] font-medium"
            >
              {REPORT_DEPARTMENTS.map((code) => (
                <option key={code} value={code}>
                  {code === "all"
                    ? ui.report.allDepartments
                    : getDepartmentLabel(code, locale)}
                </option>
              ))}
            </select>
          ) : null}

          <div className="dashboard-input flex h-9 items-center rounded-[0.7rem] p-1">
            {(["7d", "30d"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  updateParams({ range: value, page: null, filter_date: null })
                }
                className={[
                  "rounded-[0.55rem] px-3 py-1 text-[12px] font-semibold transition",
                  range === value
                    ? "bg-[color:var(--cs-primary)] text-white"
                    : "text-[color:var(--cs-text)] hover:text-[color:var(--cs-primary)]",
                ].join(" ")}
              >
                {value === "7d" ? ui.report.range7d : ui.report.range30d}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleAdmin}
            className={[
              "dashboard-input h-9 rounded-[0.7rem] px-3 text-[11px] font-semibold",
              adminMode ? "text-[color:var(--cs-primary)]" : "text-[color:var(--cs-text-soft)]",
            ].join(" ")}
          >
            {adminMode ? ui.report.adminOn : ui.report.adminOff}
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-[0.85rem] border border-[color:rgba(229,72,77,0.22)] bg-[color:rgba(229,72,77,0.08)] px-4 py-3 text-[12px] text-[color:var(--cs-danger)]">
          {error}
        </div>
      ) : null}

      <ReportShiftDutyPanel
        data={overview}
        loading={loading}
        labels={ui.report.overview}
      />

      <div>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[color:var(--cs-text-soft)]">
          {ui.report.periodTitle}
        </h2>
        {!loading && summary && summary.total_alerts === 0 ? (
          <div className="dashboard-surface mb-3 rounded-[1rem] px-4 py-4 text-center text-[13px] text-[color:var(--cs-text-soft)]">
            {ui.report.emptyAlerts}
          </div>
        ) : null}
        <ReportSummaryCards summary={summary} loading={loading} labels={ui.report.cards} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ReportInsightsPanel
            data={insights}
            loading={loading}
            labels={ui.report.insights}
          />
        </div>
        <div className="xl:col-span-1">
          <ReportAlertByTypeChart
            data={byType}
            loading={loading}
            title={ui.report.byTypeTitle}
          />
        </div>
      </div>

      <ReportHeatmap
        data={heatmap}
        loading={loading}
        title={ui.report.heatmapTitle}
        labels={ui.report.heatmap}
        onSelectDate={(date) => updateParams({ filter_date: date, page: "1" })}
        selectedDate={filterDate}
      />

      <ReportPatientRiskTable
        data={patientRisk}
        loading={loading}
        sort={sort}
        filterDate={filterDate}
        onSort={(nextSort) => updateParams({ sort: nextSort, page: "1" })}
        onPage={(nextPage) => updateParams({ page: String(nextPage) })}
        onClearFilter={() => updateParams({ filter_date: null, page: "1" })}
        showDepartment={adminMode}
        title={ui.report.tableTitle}
        labels={ui.report.table}
      />
    </div>
  );
}
