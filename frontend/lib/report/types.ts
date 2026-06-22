import type { AlertSeverity, AlertType, LocalizedString, PatientStatus } from "@/types";

export type ReportRangeKey = "7d" | "30d";

export type ReportHeatmapLevel = "critical" | "warning" | "normal";

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
  updated_at: string;
  department_code: string;
  department_label: LocalizedString;
  range: ReportRangeKey;
};

export type ReportShiftStaffMember = {
  id: string;
  name: string;
  role: "coordinator" | "floor_nurse" | "doctor";
  zone_code: string;
  status: "active" | "break" | "off";
};

export type ReportOverviewResponse = {
  today_date: string;
  total_patients: number;
  current_shift: "morning" | "afternoon" | "night";
  shift_label: LocalizedString;
  shift_hours: LocalizedString;
  shift_staff: ReportShiftStaffMember[];
  nurses_on_duty: number;
  doctors_on_duty: number;
  coordinators_on_duty: number;
  staff_on_duty_total: number;
  department_code: string;
  department_label: LocalizedString;
};

export type DailyReportActivity = {
  id: string;
  confirmed_at: string;
  patient_id: string;
  patient_name: string;
  bed: string | null | undefined;
  department_label: LocalizedString;
  alert_type: AlertType;
  severity: AlertSeverity;
  conclusion: string;
};

export type DailyReportResponse = {
  date: string;
  doctor_id: string | null;
  doctor_name: string;
  examined_patients: number;
  confirmation_count: number;
  critical_reviewed: number;
  pending_confirmations: number;
  current_shift: ReportOverviewResponse["current_shift"];
  shift_label: LocalizedString;
  shift_hours: LocalizedString;
  activities: DailyReportActivity[];
};

export type ReportInsightsResponse = {
  patient_status: {
    critical: number;
    at_risk: number;
    recent_symptom: number;
    healthy: number;
  };
  alerts_today: {
    total: number;
    critical: number;
    warning: number;
    open_unresolved: number;
    pending_doctor: number;
  };
  workflow_period: {
    open: number;
    pending_doctor: number;
    resolved: number;
  };
  vitals_snapshot: {
    avg_spo2: number | null;
    avg_hr: number | null;
    low_spo2_patients: number;
    elevated_hr_patients: number;
  };
  attention_patients: Array<{
    patient_id: string;
    patient_name: string;
    bed: string | null | undefined;
    critical_alerts: number;
    status: PatientStatus;
  }>;
  range: ReportRangeKey;
  department_code: string;
};

/** @deprecated Replaced by overview + insights */
export type ReportAlertTrendResponse = {
  dates: string[];
  critical: number[];
  warning: number[];
  range: ReportRangeKey;
  department_code: string;
};

export type ReportAlertByTypeItem = {
  type: AlertType;
  count: number;
  severity: AlertSeverity;
};

export type ReportAlertByTypeResponse = {
  items: ReportAlertByTypeItem[];
  top_insight: LocalizedString;
  range: ReportRangeKey;
  department_code: string;
};

export type ReportHeatmapDay = {
  date: string;
  level: ReportHeatmapLevel;
  critical_count: number;
  warning_count: number;
  total_count: number;
};

export type ReportHeatmapRow = {
  patient_id: string;
  patient_name: string;
  days: ReportHeatmapDay[];
};

export type ReportHeatmapResponse = {
  dates: string[];
  rows: ReportHeatmapRow[];
  range: ReportRangeKey;
  department_code: string;
};

export type ReportPatientRiskRow = {
  patient_id: string;
  patient_name: string;
  age: number;
  bed: string | null | undefined;
  department_code: string;
  department_label: LocalizedString;
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
  range: ReportRangeKey;
  department_code: string;
  filter_date: string | null;
};

export type ReportQuery = {
  range: ReportRangeKey;
  department: string;
  sort?: string;
  page?: number;
  filter_date?: string | null;
};
