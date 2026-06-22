import { clinicalApiGet } from "@/lib/api/client";
import type {
  DailyReportResponse,
  ReportAlertByTypeResponse,
  ReportHeatmapResponse,
  ReportInsightsResponse,
  ReportOverviewResponse,
  ReportPatientRiskResponse,
  ReportQuery,
  ReportRangeKey,
  ReportSummaryResponse,
} from "@/lib/report/types";

function buildQueryString(query: ReportQuery & { filter_date?: string | null }) {
  const params = new URLSearchParams();
  params.set("range", query.range);
  params.set("department", query.department);
  if (query.sort) params.set("sort", query.sort);
  if (query.page) params.set("page", String(query.page));
  if (query.filter_date) params.set("filter_date", query.filter_date);
  return params.toString();
}

export const reportRepository = {
  getDaily() {
    return clinicalApiGet<DailyReportResponse>("/api/report/daily");
  },
  getSummary(query: Pick<ReportQuery, "range" | "department">) {
    return clinicalApiGet<ReportSummaryResponse>(
      `/api/report/summary?${buildQueryString(query)}`,
    );
  },
  getOverview(query: Pick<ReportQuery, "range" | "department">) {
    return clinicalApiGet<ReportOverviewResponse>(
      `/api/report/overview?${buildQueryString(query)}`,
    );
  },
  getInsights(query: Pick<ReportQuery, "range" | "department">) {
    return clinicalApiGet<ReportInsightsResponse>(
      `/api/report/insights?${buildQueryString(query)}`,
    );
  },
  getAlertByType(query: Pick<ReportQuery, "range" | "department">) {
    return clinicalApiGet<ReportAlertByTypeResponse>(
      `/api/report/alert-by-type?${buildQueryString(query)}`,
    );
  },
  getHeatmap(query: Pick<ReportQuery, "range" | "department">) {
    return clinicalApiGet<ReportHeatmapResponse>(
      `/api/report/heatmap?${buildQueryString(query)}`,
    );
  },
  getPatientRisk(
    query: Pick<ReportQuery, "range" | "department" | "sort" | "page"> & {
      filter_date?: string | null;
    },
  ) {
    return clinicalApiGet<ReportPatientRiskResponse>(
      `/api/report/patient-risk?${buildQueryString(query)}`,
    );
  },
};

export type { ReportRangeKey };
