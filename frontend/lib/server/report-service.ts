import { enrichAlertDto } from "@/lib/mock/alert-workflow-store";
import {
  DEFAULT_CLINICIAN_DEPARTMENT,
  REPORT_DEPARTMENTS,
} from "@/lib/report/constants";
import type {
  HeatmapLevel,
  ReportAlertByTypeResponse,
  ReportAlertTrendResponse,
  ReportHeatmapResponse,
  ReportPatientRiskResponse,
  ReportRange,
  ReportSummaryResponse,
} from "@/lib/report/types";
import { getAlerts, getPatients, getVitals } from "@/lib/server/clinical-store";
import type {
  AlertSeverity,
  AlertType,
  Patient,
  PatientStatus,
} from "@/types";

const ALERT_TYPES: AlertType[] = [
  "low_oxygen",
  "high_heart_rate",
  "low_heart_rate",
  "high_blood_pressure",
  "low_blood_pressure",
  "deterioration_risk",
  "stroke_risk",
];

const TYPE_DEFAULT_SEVERITY: Record<AlertType, AlertSeverity> = {
  low_oxygen: "warning",
  high_heart_rate: "warning",
  low_heart_rate: "warning",
  high_blood_pressure: "warning",
  low_blood_pressure: "warning",
  deterioration_risk: "warning",
  stroke_risk: "critical",
};

type ReportAlertRecord = {
  id: string;
  patientId: string;
  type: AlertType;
  severity: AlertSeverity;
  date: string;
  acknowledged: boolean;
  resolved: boolean;
  responseMinutes: number | null;
};

export type ReportQuery = {
  range: ReportRange;
  department?: string | null;
  sort?: string;
  page?: number;
  filterDate?: string | null;
};

export function parseReportRange(value: string | null): ReportRange {
  return value === "30d" ? "30d" : "7d";
}

export function rangeToDays(range: ReportRange) {
  return range === "30d" ? 30 : 7;
}

function hashCode(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function buildDateWindow(days: number, anchor = new Date()) {
  const end = startOfDay(anchor);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const dates = Array.from({ length: days }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return toDateKey(current);
  });
  return { start, end, dates };
}

function statusWeight(status: PatientStatus) {
  switch (status) {
    case "critical":
      return 0.42;
    case "at_risk":
      return 0.28;
    case "recent_symptom":
      return 0.2;
    default:
      return 0.08;
  }
}

function isResolved(acknowledged: boolean, workflowStatus: string) {
  return (
    acknowledged ||
    ["nurse_treated", "noise", "needs_follow_up", "doctor_confirmed"].includes(
      workflowStatus,
    )
  );
}

function pickType(patient: Patient, seed: number): AlertType {
  if (patient.recentSymptomCodes.includes("dizziness")) return "stroke_risk";
  if (patient.recentSymptomCodes.includes("shortness_of_breath")) {
    return seed % 2 === 0 ? "low_oxygen" : "deterioration_risk";
  }
  if (patient.underlyingConditionCodes.includes("hypertension")) {
    return seed % 3 === 0 ? "high_blood_pressure" : "high_heart_rate";
  }
  return ALERT_TYPES[seed % ALERT_TYPES.length];
}

function severityForType(type: AlertType, seed: number): AlertSeverity {
  if (type === "stroke_risk") return "critical";
  if (type === "high_blood_pressure" && seed % 4 === 0) return "critical";
  if (type === "low_oxygen" && seed % 5 === 0) return "critical";
  return TYPE_DEFAULT_SEVERITY[type];
}

function filterPatientsByDepartment(
  patients: Patient[],
  department?: string | null,
) {
  if (!department || department === "all") return patients;
  return patients.filter((patient) => patient.departmentCode === department);
}

function loadSeedAlerts(patients: Patient[]): ReportAlertRecord[] {
  const patientIds = new Set(patients.map((patient) => patient.id));
  return getAlerts()
    .filter((alert) => patientIds.has(alert.patientId))
    .map((alert) => {
      const enriched = enrichAlertDto({
        id: alert.id,
        patient_id: alert.patientId,
      });
      const resolved = isResolved(alert.acknowledged, enriched.workflow_status);
      const seed = hashCode(alert.id);
      return {
        id: alert.id,
        patientId: alert.patientId,
        type: alert.type,
        severity: alert.severity === "info" ? "warning" : alert.severity,
        date: alert.timestamp.slice(0, 10),
        acknowledged: alert.acknowledged,
        resolved,
        responseMinutes: resolved ? 8 + (seed % 18) : null,
      };
    });
}

function synthesizeAlerts(
  patients: Patient[],
  dates: string[],
  rangeKey: string,
): ReportAlertRecord[] {
  const records: ReportAlertRecord[] = [];

  for (const patient of patients) {
    for (const date of dates) {
      const seed = hashCode(`${rangeKey}:${patient.id}:${date}`);
      const chance = statusWeight(patient.status);
      const roll = (seed % 100) / 100;
      if (roll > chance) continue;

      const alertCount = 1 + (seed % (patient.status === "critical" ? 2 : 1));
      for (let index = 0; index < alertCount; index += 1) {
        const innerSeed = seed + index * 17;
        const type = pickType(patient, innerSeed);
        const severity = severityForType(type, innerSeed);
        const resolved = innerSeed % 10 !== 0;
        records.push({
          id: `syn-${patient.id}-${date}-${index}`,
          patientId: patient.id,
          type,
          severity,
          date,
          acknowledged: resolved,
          resolved,
          responseMinutes: resolved ? 10 + (innerSeed % 25) : null,
        });
      }
    }
  }

  return records;
}

function buildAlertDataset(query: ReportQuery, offsetDays = 0) {
  const days = rangeToDays(query.range);
  const anchor = new Date();
  if (offsetDays > 0) {
    anchor.setDate(anchor.getDate() - offsetDays);
  }
  const { dates } = buildDateWindow(days, anchor);
  const patients = filterPatientsByDepartment(getPatients(), query.department);
  const seedAlerts = loadSeedAlerts(patients);
  const synthetic = synthesizeAlerts(
    patients,
    dates,
    `${query.range}:${query.department ?? "all"}:${offsetDays}`,
  );

  const dateSet = new Set(dates);
  const merged = [...synthetic];
  for (const alert of seedAlerts) {
    if (dateSet.has(alert.date)) {
      merged.push(alert);
    }
  }

  return { patients, dates, alerts: merged };
}

function countSeverity(alerts: ReportAlertRecord[]) {
  let critical = 0;
  let warning = 0;
  for (const alert of alerts) {
    if (alert.severity === "critical") critical += 1;
    else warning += 1;
  }
  return { critical, warning };
}

function computeResolveRate(alerts: ReportAlertRecord[]) {
  if (!alerts.length) return 0;
  const resolved = alerts.filter((alert) => alert.resolved).length;
  return Math.round((resolved / alerts.length) * 100);
}

function computeAvgResponse(alerts: ReportAlertRecord[]) {
  const samples = alerts
    .map((alert) => alert.responseMinutes)
    .filter((value): value is number => value !== null);
  if (!samples.length) return 0;
  return Math.round(
    samples.reduce((sum, value) => sum + value, 0) / samples.length,
  );
}

function heatmapLevel(critical: number, warning: number): HeatmapLevel {
  if (critical > 0) return "critical";
  if (warning > 0) return "warning";
  return "normal";
}

function averageVital(
  patientId: string,
  metric: "spo2" | "heart_rate",
  dates: string[],
): number | null {
  const dateSet = new Set(dates);
  const samples = getVitals().filter(
    (sample) =>
      sample.patientId === patientId &&
      dateSet.has(sample.timestamp.slice(0, 10)),
  );
  if (!samples.length) return null;

  const values = samples
    .map((sample) => {
      switch (metric) {
        case "heart_rate":
          return sample.vitals.heartRate;
        case "spo2":
          return sample.vitals.spo2;
        default:
          return undefined;
      }
    })
    .filter((value): value is number => typeof value === "number");

  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function fallbackVital(patient: Patient, metric: "spo2" | "heart_rate") {
  const seed = hashCode(`${patient.id}:${metric}`);
  if (metric === "spo2") {
    if (patient.status === "critical") return 91 + (seed % 3);
    if (patient.status === "at_risk") return 94 + (seed % 2);
    return 96 + (seed % 3);
  }
  if (metric === "heart_rate") {
    if (patient.status === "critical") return 98 + (seed % 12);
    if (patient.status === "at_risk") return 86 + (seed % 10);
    return 72 + (seed % 8);
  }
  return null;
}

function topMetricForPatient(
  patientId: string,
  alerts: ReportAlertRecord[],
): string {
  const counts = new Map<string, number>();
  for (const alert of alerts.filter((item) => item.patientId === patientId)) {
    const key =
      alert.type === "low_oxygen"
        ? "SpO₂"
        : alert.type === "high_heart_rate" || alert.type === "low_heart_rate"
          ? "HR"
          : alert.type === "high_blood_pressure" ||
              alert.type === "low_blood_pressure"
            ? "BP"
            : alert.type === "stroke_risk"
              ? "Neuro"
              : "RR";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let top = "—";
  let max = 0;
  for (const [key, count] of counts) {
    if (count > max) {
      max = count;
      top = key;
    }
  }
  return top;
}

export function getReportSummary(query: ReportQuery): ReportSummaryResponse {
  const current = buildAlertDataset(query);
  const previous = buildAlertDataset(query, rangeToDays(query.range));

  const currentCriticalWarning = countSeverity(current.alerts);
  const previousCriticalWarning = countSeverity(previous.alerts);
  const resolveRate = computeResolveRate(current.alerts);
  const prevResolveRate = computeResolveRate(previous.alerts);
  const avgResponse = computeAvgResponse(current.alerts);
  const prevAvgResponse = computeAvgResponse(previous.alerts);

  return {
    total_patients: current.patients.length,
    total_alerts: current.alerts.length,
    critical_count: currentCriticalWarning.critical,
    warning_count: currentCriticalWarning.warning,
    resolve_rate: resolveRate,
    avg_response_minutes: avgResponse,
    trends: {
      patients_delta: current.patients.length - previous.patients.length,
      alerts_delta: current.alerts.length - previous.alerts.length,
      resolve_rate_delta: resolveRate - prevResolveRate,
      response_delta: avgResponse - prevAvgResponse,
    },
    department_code: query.department ?? "all",
    range: query.range,
    updated_at: new Date().toISOString(),
  };
}

export function getReportAlertTrend(
  query: ReportQuery,
): ReportAlertTrendResponse {
  const { dates, alerts } = buildAlertDataset(query);
  const critical = dates.map(
    (date) =>
      alerts.filter(
        (alert) => alert.date === date && alert.severity === "critical",
      ).length,
  );
  const warning = dates.map(
    (date) =>
      alerts.filter(
        (alert) =>
          alert.date === date &&
          (alert.severity === "warning" || alert.severity === "info"),
      ).length,
  );

  return {
    dates,
    critical,
    warning,
    range: query.range,
    department_code: query.department ?? "all",
  };
}

export function getReportAlertByType(
  query: ReportQuery,
): ReportAlertByTypeResponse {
  const { alerts } = buildAlertDataset(query);
  const counts = new Map<AlertType, { count: number; severity: AlertSeverity }>();

  for (const alert of alerts) {
    const existing = counts.get(alert.type);
    if (!existing) {
      counts.set(alert.type, { count: 1, severity: alert.severity });
      continue;
    }
    existing.count += 1;
    if (alert.severity === "critical") existing.severity = "critical";
  }

  const items = [...counts.entries()]
    .map(([type, value]) => ({
      type,
      count: value.count,
      severity: value.severity,
    }))
    .sort((left, right) => right.count - left.count);

  const total = alerts.length || 1;
  const top = items[0] ?? null;

  return {
    items,
    top_insight_type: top?.type ?? null,
    top_insight_percent: top ? Math.round((top.count / total) * 100) : 0,
    range: query.range,
    department_code: query.department ?? "all",
  };
}

export function getReportHeatmap(query: ReportQuery): ReportHeatmapResponse {
  const { patients, dates, alerts } = buildAlertDataset(query);

  const rows = patients.map((patient) => {
    const days = dates.map((date) => {
      const dayAlerts = alerts.filter(
        (alert) => alert.patientId === patient.id && alert.date === date,
      );
      const critical = dayAlerts.filter(
        (alert) => alert.severity === "critical",
      ).length;
      const warning = dayAlerts.filter(
        (alert) =>
          alert.severity === "warning" || alert.severity === "info",
      ).length;
      return {
        date,
        level: heatmapLevel(critical, warning),
        total: dayAlerts.length,
        critical,
        warning,
      };
    });

    return {
      patient_id: patient.id,
      patient_name: patient.name,
      days,
    };
  });

  return {
    dates,
    patients: rows.sort((left, right) => {
      const leftScore = left.days.reduce(
        (sum, day) => sum + day.critical * 3 + day.warning,
        0,
      );
      const rightScore = right.days.reduce(
        (sum, day) => sum + day.critical * 3 + day.warning,
        0,
      );
      return rightScore - leftScore;
    }),
    range: query.range,
    department_code: query.department ?? "all",
  };
}

export function getReportPatientRisk(
  query: ReportQuery,
): ReportPatientRiskResponse {
  const pageSize = 10;
  const page = Math.max(1, query.page ?? 1);
  const { patients, dates, alerts } = buildAlertDataset(query);
  const scopedAlerts = query.filterDate
    ? alerts.filter((alert) => alert.date === query.filterDate)
    : alerts;

  const rows = patients.map((patient) => {
    const patientAlerts = scopedAlerts.filter(
      (alert) => alert.patientId === patient.id,
    );
    return {
      patient_id: patient.id,
      patient_name: patient.name,
      age: patient.age,
      bed: patient.bed,
      department_code: patient.departmentCode,
      total_alerts: patientAlerts.length,
      critical_alerts: patientAlerts.filter(
        (alert) => alert.severity === "critical",
      ).length,
      top_metric: topMetricForPatient(patient.id, scopedAlerts),
      avg_spo2:
        averageVital(patient.id, "spo2", dates) ??
        fallbackVital(patient, "spo2"),
      avg_hr:
        averageVital(patient.id, "heart_rate", dates) ??
        fallbackVital(patient, "heart_rate"),
      status: patient.status,
    };
  });

  const sorted = sortPatientRisk(rows, query.sort);
  const start = (page - 1) * pageSize;

  return {
    patients: sorted.slice(start, start + pageSize),
    total: sorted.length,
    page,
    page_size: pageSize,
    range: query.range,
    department_code: query.department ?? "all",
    filter_date: query.filterDate ?? null,
  };
}

function sortPatientRisk<T extends { critical_alerts: number; total_alerts: number; patient_name: string; avg_spo2: number | null; avg_hr: number | null; status: PatientStatus }>(
  rows: T[],
  sort?: string,
) {
  const copy = [...rows];
  switch (sort) {
    case "patient_asc":
      return copy.sort((a, b) => a.patient_name.localeCompare(b.patient_name));
    case "total_desc":
      return copy.sort((a, b) => b.total_alerts - a.total_alerts);
    case "total_asc":
      return copy.sort((a, b) => a.total_alerts - b.total_alerts);
    case "spo2_asc":
      return copy.sort(
        (a, b) => (a.avg_spo2 ?? 999) - (b.avg_spo2 ?? 999),
      );
    case "spo2_desc":
      return copy.sort(
        (a, b) => (b.avg_spo2 ?? 0) - (a.avg_spo2 ?? 0),
      );
    case "hr_desc":
      return copy.sort((a, b) => (b.avg_hr ?? 0) - (a.avg_hr ?? 0));
    case "hr_asc":
      return copy.sort((a, b) => (a.avg_hr ?? 999) - (b.avg_hr ?? 999));
    case "status":
      return copy.sort((a, b) => a.status.localeCompare(b.status));
    case "critical_asc":
      return copy.sort((a, b) => a.critical_alerts - b.critical_alerts);
    case "critical_desc":
    default:
      return copy.sort((a, b) => b.critical_alerts - a.critical_alerts);
  }
}

export function listReportDepartments() {
  const fromPatients = new Set(
    getPatients()
      .map((patient) => patient.departmentCode)
      .filter((code): code is string => Boolean(code)),
  );
  return REPORT_DEPARTMENTS.filter(
    (code) => fromPatients.has(code) || code === "cardiology",
  );
}
