import { clinicalApiGet } from "@/lib/api/client";
import type {
  ReportAlertByTypeResponse,
  ReportAlertTrendResponse,
  ReportHeatmapResponse,
  ReportPatientRiskResponse,
  ReportRange,
  ReportSummaryResponse,
} from "@/lib/report/types";

function buildQuery(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const reportRepository = {
  getSummary(range: ReportRange, department?: string | null) {
    return clinicalApiGet<ReportSummaryResponse>(
      `/api/report/summary${buildQuery({ range, department })}`,
      { errorMessage: "Unable to load report summary" },
    );
  },

  getAlertTrend(range: ReportRange, department?: string | null) {
    return clinicalApiGet<ReportAlertTrendResponse>(
      `/api/report/alert-trend${buildQuery({ range, department })}`,
      { errorMessage: "Unable to load alert trend" },
    );
  },

  getAlertByType(range: ReportRange, department?: string | null) {
    return clinicalApiGet<ReportAlertByTypeResponse>(
      `/api/report/alert-by-type${buildQuery({ range, department })}`,
      { errorMessage: "Unable to load alert breakdown" },
    );
  },

  getHeatmap(range: ReportRange, department?: string | null) {
    return clinicalApiGet<ReportHeatmapResponse>(
      `/api/report/heatmap${buildQuery({ range, department })}`,
      { errorMessage: "Unable to load anomaly heatmap" },
    );
  },

  getPatientRisk(input: {
    range: ReportRange;
    department?: string | null;
    sort?: string;
    page?: number;
    date?: string | null;
  }) {
    return clinicalApiGet<ReportPatientRiskResponse>(
      `/api/report/patient-risk${buildQuery({
        range: input.range,
        department: input.department,
        sort: input.sort,
        page: input.page,
        date: input.date,
      })}`,
      { errorMessage: "Unable to load patient risk table" },
    );
  },
};
