import type { AlertSeverity, AlertType, PatientStatus } from "@/types";

export type ReportRange = "7d" | "30d";

export type HeatmapLevel = "critical" | "warning" | "normal";

export type ReportTrendDirection = "up" | "down" | "flat";

export type ReportSummaryResponse = {
  total_patients: number;
  total_alerts: number;
  critical_count: number;
  warning_count: number;
  resolve_rate: number;
  avg_response_minutes: number;
  trends: {
    patients_delta: number;
    alerts_delta: number;
    resolve_rate_delta: number;
    response_delta: number;
  };
  department_code: string;
  range: ReportRange;
  updated_at: string;
};

export type ReportAlertTrendResponse = {
  dates: string[];
  critical: number[];
  warning: number[];
  range: ReportRange;
  department_code: string;
};

export type ReportAlertByTypeItem = {
  type: AlertType;
  count: number;
  severity: AlertSeverity;
};

export type ReportAlertByTypeResponse = {
  items: ReportAlertByTypeItem[];
  top_insight_type: AlertType | null;
  top_insight_percent: number;
  range: ReportRange;
  department_code: string;
};

export type ReportHeatmapDay = {
  date: string;
  level: HeatmapLevel;
  total: number;
  critical: number;
  warning: number;
};

export type ReportHeatmapRow = {
  patient_id: string;
  patient_name: string;
  days: ReportHeatmapDay[];
};

export type ReportHeatmapResponse = {
  dates: string[];
  patients: ReportHeatmapRow[];
  range: ReportRange;
  department_code: string;
};

export type ReportPatientRiskRow = {
  patient_id: string;
  patient_name: string;
  age: number;
  bed?: string;
  department_code?: string;
  total_alerts: number;
  critical_alerts: number;
  top_metric: string;
  avg_spo2: number | null;
  avg_hr: number | null;
  status: PatientStatus;
};

export type ReportPatientRiskResponse = {
  patients: ReportPatientRiskRow[];
  total: number;
  page: number;
  page_size: number;
  range: ReportRange;
  department_code: string;
  filter_date: string | null;
};
