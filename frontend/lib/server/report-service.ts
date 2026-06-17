import { listPendingDoctorConfirmations } from "@/lib/mock/alert-workflow-store";
import {
  buildLocalizedPair,
  getAlertTypeLabel,
  getDepartmentLabel,
  getMetricLabel,
  getShiftBandHours,
  getShiftBandLabel,
} from "@/lib/i18n/domain";
import type {
  ReportAlertByTypeResponse,
  ReportAlertTrendResponse,
  ReportHeatmapLevel,
  ReportHeatmapResponse,
  ReportInsightsResponse,
  ReportOverviewResponse,
  ReportPatientRiskResponse,
  ReportPatientRiskRow,
  ReportQuery,
  ReportRangeKey,
  ReportSummaryResponse,
} from "@/lib/report/types";
import {
  buildWeekSchedule,
  getAlerts,
  getPatients,
  getStaffMember,
  getVitals,
  getWeekDates,
  listStaff,
} from "@/lib/server/clinical-store";
import type { Alert, AlertSeverity, AlertType, Patient, PatientStatus } from "@/types";
import {
  DEFAULT_REPORT_DEPARTMENT,
} from "@/lib/report/constants";
import { getCurrentShiftBand } from "@/lib/shift-band";
import type { ShiftBand, ShiftStaffMember } from "@/types";

export { DEFAULT_REPORT_DEPARTMENT, REPORT_DEPARTMENTS } from "@/lib/report/constants";

type ReportAlertRecord = {
  id: string;
  patientId: string;
  type: AlertType;
  severity: AlertSeverity;
  date: string;
  timestamp: string;
  resolved: boolean;
  responseMinutes: number;
};

function text(vi: string, en: string) {
  return { vi, en };
}

function hashCode(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildDateRange(days: number, anchor = new Date()): string[] {
  return Array.from({ length: days }, (_, index) => {
    const next = new Date(anchor);
    next.setDate(anchor.getDate() - (days - 1 - index));
    return toDateKey(next);
  });
}

function parseRange(range: string | null | undefined): ReportRangeKey {
  return range === "30d" ? "30d" : "7d";
}

function rangeDays(range: ReportRangeKey): number {
  return range === "30d" ? 30 : 7;
}

function departmentLabel(code: string) {
  if (code === "all") {
    return text("Toàn viện", "Hospital-wide");
  }
  return buildLocalizedPair(code, {
    [code]: text(
      getDepartmentLabel(code, "vi"),
      getDepartmentLabel(code, "en"),
    ),
  });
}

async function filterPatients(department: string): Promise<Patient[]> {
  const patients = await getPatients();
  if (department === "all") return patients;
  return patients.filter((patient) => patient.departmentCode === department);
}

function isResolved(alert: Pick<Alert, "acknowledged" | "workflowStatus">): boolean {
  return (
    alert.acknowledged ||
    alert.workflowStatus === "doctor_confirmed" ||
    alert.workflowStatus === "noise"
  );
}

function pickAlertType(patient: Patient, seed: number): AlertType {
  const types: AlertType[] = [
    "low_oxygen",
    "high_heart_rate",
    "high_blood_pressure",
    "deterioration_risk",
    "stroke_risk",
    "low_blood_pressure",
    "low_heart_rate",
  ];
  if (patient.departmentCode === "neurology") {
    return seed % 3 === 0 ? "stroke_risk" : types[seed % types.length];
  }
  if (patient.departmentCode === "cardiology") {
    return seed % 2 === 0 ? "high_heart_rate" : "high_blood_pressure";
  }
  if (patient.departmentCode === "pulmonology") {
    return "low_oxygen";
  }
  return types[seed % types.length];
}

function pickSeverity(patient: Patient, seed: number): AlertSeverity {
  if (patient.status === "critical") {
    return seed % 4 === 0 ? "warning" : "critical";
  }
  if (patient.status === "at_risk") {
    return seed % 3 === 0 ? "critical" : "warning";
  }
  if (patient.status === "recent_symptom") {
    return seed % 5 === 0 ? "critical" : "warning";
  }
  return seed % 6 === 0 ? "warning" : "info";
}

function buildReportAlerts(
  patients: Patient[],
  dates: string[],
  sourceAlerts: Alert[],
): ReportAlertRecord[] {
  const patientIds = new Set(patients.map((patient) => patient.id));
  const records: ReportAlertRecord[] = [];
  const seen = new Set<string>();

  for (const alert of sourceAlerts) {
    if (!patientIds.has(alert.patientId)) continue;
    const dayIndex = hashCode(alert.id) % dates.length;
    const date = dates[dayIndex];
    const hour = 6 + (hashCode(`${alert.id}-h`) % 14);
    const timestamp = `${date}T${String(hour).padStart(2, "0")}:${String(hashCode(alert.id) % 60).padStart(2, "0")}:00Z`;
    const responseMinutes = 8 + (hashCode(`${alert.id}-resp`) % 22);
    records.push({
      id: alert.id,
      patientId: alert.patientId,
      type: alert.type,
      severity: alert.severity,
      date,
      timestamp,
      resolved: isResolved(alert),
      responseMinutes,
    });
    seen.add(alert.id);
  }

  for (const patient of patients) {
    for (const date of dates) {
      const seed = hashCode(`${patient.id}-${date}`);
      const baseCount =
        patient.status === "critical"
          ? 1 + (seed % 3)
          : patient.status === "at_risk"
            ? seed % 3
            : patient.status === "recent_symptom"
              ? seed % 2
              : seed % 5 === 0
                ? 1
                : 0;

      for (let index = 0; index < baseCount; index += 1) {
        const syntheticId = `rpt-${patient.id}-${date}-${index}`;
        if (seen.has(syntheticId)) continue;
        const type = pickAlertType(patient, seed + index);
        const severity = pickSeverity(patient, seed + index * 3);
        const hour = 7 + ((seed + index) % 12);
        const timestamp = `${date}T${String(hour).padStart(2, "0")}:${String((seed + index * 7) % 60).padStart(2, "0")}:00Z`;
        const responseMinutes = 10 + ((seed + index) % 18);
        const resolved = (seed + index) % 5 !== 0;
        records.push({
          id: syntheticId,
          patientId: patient.id,
          type,
          severity,
          date,
          timestamp,
          resolved,
          responseMinutes,
        });
      }
    }
  }

  return records;
}

function countSeverity(alerts: ReportAlertRecord[]) {
  let critical = 0;
  let warning = 0;
  for (const alert of alerts) {
    if (alert.severity === "critical") critical += 1;
    else if (alert.severity === "warning") warning += 1;
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
  const acknowledged = alerts.filter((alert) => alert.resolved);
  if (!acknowledged.length) return 0;
  const total = acknowledged.reduce((sum, alert) => sum + alert.responseMinutes, 0);
  return Math.round(total / acknowledged.length);
}

function getPatientVitalAverages(
  patientId: string,
  dates: string[],
  allVitals: Awaited<ReturnType<typeof getVitals>>,
) {
  const dateSet = new Set(dates);
  const samples = allVitals.filter((sample) => {
    if (sample.patientId !== patientId) return false;
    return dateSet.has(sample.timestamp.slice(0, 10));
  });

  if (!samples.length) {
    const seed = hashCode(patientId);
    return {
      spo2: 94 + (seed % 4),
      hr: 72 + (seed % 28),
    };
  }

  let spo2Sum = 0;
  let spo2Count = 0;
  let hrSum = 0;
  let hrCount = 0;
  for (const sample of samples) {
    if (sample.vitals.spo2 !== undefined) {
      spo2Sum += sample.vitals.spo2;
      spo2Count += 1;
    }
    if (sample.vitals.heartRate !== undefined) {
      hrSum += sample.vitals.heartRate;
      hrCount += 1;
    }
  }

  return {
    spo2: spo2Count ? Math.round((spo2Sum / spo2Count) * 10) / 10 : null,
    hr: hrCount ? Math.round(hrSum / hrCount) : null,
  };
}

function topMetricForPatient(
  patientId: string,
  alerts: ReportAlertRecord[],
): string {
  const counts = new Map<string, number>();
  for (const alert of alerts) {
    if (alert.patientId !== patientId) continue;
    const metric = alertTypeToMetric(alert.type);
    counts.set(metric, (counts.get(metric) ?? 0) + 1);
  }
  let top = "spo2";
  let topCount = 0;
  for (const [metric, count] of counts) {
    if (count > topCount) {
      top = metric;
      topCount = count;
    }
  }
  return getMetricLabel(top as "spo2", "vi");
}

function alertTypeToMetric(type: AlertType): string {
  switch (type) {
    case "low_oxygen":
      return "spo2";
    case "high_heart_rate":
    case "low_heart_rate":
      return "heart_rate";
    case "high_blood_pressure":
    case "low_blood_pressure":
      return "systolic_bp";
    case "deterioration_risk":
      return "respiratory_rate";
    default:
      return "heart_rate";
  }
}

function heatmapLevel(
  criticalCount: number,
  warningCount: number,
): ReportHeatmapLevel {
  if (criticalCount > 0) return "critical";
  if (warningCount > 0) return "warning";
  return "normal";
}

async function buildContext(query: ReportQuery) {
  const range = parseRange(query.range);
  const days = rangeDays(range);
  const dates = buildDateRange(days);
  const prevAnchor = new Date(`${dates[0]}T00:00:00`);
  prevAnchor.setDate(prevAnchor.getDate() - 1);
  const prevDates = buildDateRange(days, prevAnchor);
  const department = query.department || DEFAULT_REPORT_DEPARTMENT;
  const sourceAlerts = await getAlerts();
  const patients = await filterPatients(department);
  const alerts = buildReportAlerts(patients, dates, sourceAlerts);
  const prevPatients = await filterPatients(department);
  const prevAlerts = buildReportAlerts(prevPatients, prevDates, sourceAlerts);

  return {
    range,
    department,
    dates,
    patients,
    alerts,
    prevAlerts,
    sourceAlerts,
    filterDate: query.filter_date ?? null,
  };
}

export function parseReportQuery(searchParams: URLSearchParams): ReportQuery {
  return {
    range: parseRange(searchParams.get("range")),
    department: searchParams.get("department") ?? DEFAULT_REPORT_DEPARTMENT,
    sort: searchParams.get("sort") ?? "critical_desc",
    page: Math.max(1, Number(searchParams.get("page") ?? "1") || 1),
    filter_date: searchParams.get("filter_date"),
  };
}

export async function getReportSummary(query: ReportQuery): Promise<ReportSummaryResponse> {
  const ctx = await buildContext(query);
  const { critical, warning } = countSeverity(ctx.alerts);

  return {
    total_patients: ctx.patients.length,
    total_alerts: ctx.alerts.length,
    critical_count: critical,
    warning_count: warning,
    resolve_rate: computeResolveRate(ctx.alerts),
    avg_response_minutes: computeAvgResponse(ctx.alerts),
    trends: {
      patients_delta:
        new Set(ctx.alerts.map((alert) => alert.patientId)).size -
        new Set(ctx.prevAlerts.map((alert) => alert.patientId)).size,
      alerts_delta: ctx.alerts.length - ctx.prevAlerts.length,
      resolve_rate_delta:
        computeResolveRate(ctx.alerts) - computeResolveRate(ctx.prevAlerts),
      response_delta:
        computeAvgResponse(ctx.alerts) - computeAvgResponse(ctx.prevAlerts),
    },
    updated_at: new Date().toISOString(),
    department_code: ctx.department,
    department_label: departmentLabel(ctx.department),
    range: ctx.range,
  };
}

export async function getReportOverview(query: ReportQuery): Promise<ReportOverviewResponse> {
  const department = query.department || DEFAULT_REPORT_DEPARTMENT;
  const patients = await filterPatients(department);
  const now = new Date();
  const currentShift = getCurrentShiftBand(now);
  const shiftStaff = await getShiftStaffForBand(currentShift);
  const nurses = shiftStaff.filter((member) => member.role === "floor_nurse").length;
  const doctors = shiftStaff.filter((member) => member.role === "doctor").length;
  const coordinators = shiftStaff.filter(
    (member) => member.role === "coordinator",
  ).length;

  const bandHours = getShiftBandHours(currentShift);

  return {
    today_date: toDateKey(now),
    total_patients: patients.length,
    current_shift: currentShift,
    shift_label: text(
      getShiftBandLabel(currentShift, "vi"),
      getShiftBandLabel(currentShift, "en"),
    ),
    shift_hours: text(bandHours, bandHours),
    shift_staff: shiftStaff.map(toShiftStaffDto),
    nurses_on_duty: nurses,
    doctors_on_duty: doctors,
    coordinators_on_duty: coordinators,
    staff_on_duty_total: shiftStaff.length,
    department_code: department,
    department_label: departmentLabel(department),
  };
}

function toShiftStaffDto(member: ShiftStaffMember) {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    zone_code: member.zoneCode,
    status: member.status,
  };
}

async function getShiftStaffForBand(band: ShiftBand): Promise<ShiftStaffMember[]> {
  const today = toDateKey(new Date());
  const weekStart = (await getWeekDates())[0];
  const slots = (await buildWeekSchedule(weekStart)).filter(
    (slot) => slot.date === today && slot.band === band,
  );
  const seen = new Set<string>();
  const members: ShiftStaffMember[] = [];

  for (const slot of slots) {
    if (seen.has(slot.staffId)) continue;
    const member = await getStaffMember(slot.staffId);
    if (!member || member.status === "off") continue;
    seen.add(slot.staffId);
    members.push(member);
  }

  if (members.length > 0) {
    return members.sort((left, right) => left.name.localeCompare(right.name));
  }

  return (await listStaff())
    .filter((member) => member.status === "active")
    .sort((left, right) => left.name.localeCompare(right.name));
}

function countPatientStatus(patients: Patient[]) {
  const counts: Record<PatientStatus, number> = {
    critical: 0,
    at_risk: 0,
    recent_symptom: 0,
    healthy: 0,
  };
  for (const patient of patients) {
    counts[patient.status] += 1;
  }
  return counts;
}

async function getDepartmentVitalsSnapshot(patients: Patient[]) {
  const patientIds = new Set(patients.map((patient) => patient.id));
  const allVitals = await getVitals();
  const samples = allVitals.filter((sample) => patientIds.has(sample.patientId));

  if (!samples.length) {
    let spo2Sum = 0;
    let hrSum = 0;
    let lowSpo2 = 0;
    let elevatedHr = 0;
    for (const patient of patients) {
      const seed = hashCode(patient.id);
      const spo2 = 92 + (seed % 7);
      const hr = 68 + (seed % 35);
      spo2Sum += spo2;
      hrSum += hr;
      if (spo2 < 95) lowSpo2 += 1;
      if (hr > 100) elevatedHr += 1;
    }
    return {
      avg_spo2: patients.length
        ? Math.round((spo2Sum / patients.length) * 10) / 10
        : null,
      avg_hr: patients.length ? Math.round(hrSum / patients.length) : null,
      low_spo2_patients: lowSpo2,
      elevated_hr_patients: elevatedHr,
    };
  }

  const latestByPatient = new Map<string, (typeof samples)[number]>();
  for (const sample of samples) {
    const current = latestByPatient.get(sample.patientId);
    if (!current || sample.timestamp > current.timestamp) {
      latestByPatient.set(sample.patientId, sample);
    }
  }

  let spo2Sum = 0;
  let spo2Count = 0;
  let hrSum = 0;
  let hrCount = 0;
  let lowSpo2 = 0;
  let elevatedHr = 0;

  for (const sample of latestByPatient.values()) {
    if (sample.vitals.spo2 !== undefined) {
      spo2Sum += sample.vitals.spo2;
      spo2Count += 1;
      if (sample.vitals.spo2 < 95) lowSpo2 += 1;
    }
    if (sample.vitals.heartRate !== undefined) {
      hrSum += sample.vitals.heartRate;
      hrCount += 1;
      if (sample.vitals.heartRate > 100) elevatedHr += 1;
    }
  }

  return {
    avg_spo2: spo2Count ? Math.round((spo2Sum / spo2Count) * 10) / 10 : null,
    avg_hr: hrCount ? Math.round(hrSum / hrCount) : null,
    low_spo2_patients: lowSpo2,
    elevated_hr_patients: elevatedHr,
  };
}

export async function getReportInsights(query: ReportQuery): Promise<ReportInsightsResponse> {
  const ctx = await buildContext(query);
  const today = toDateKey(new Date());
  const todayAlerts = ctx.alerts.filter((alert) => alert.date === today);
  const patientIds = new Set(ctx.patients.map((patient) => patient.id));
  const pendingIds = await listPendingDoctorConfirmations();
  const pendingDoctor = pendingIds.filter((alertId) => {
    const alert = ctx.sourceAlerts.find((item) => item.id === alertId);
    return alert && patientIds.has(alert.patientId);
  }).length;

  const openUnresolved = ctx.sourceAlerts.filter((alert) => {
    if (!patientIds.has(alert.patientId)) return false;
    return alert.workflowStatus === "open";
  }).length;

  let workflowOpen = 0;
  let workflowPending = 0;
  let workflowResolved = 0;
  const sourceById = new Map(ctx.sourceAlerts.map((alert) => [alert.id, alert]));
  for (const alert of ctx.alerts) {
    const source = sourceById.get(alert.id);
    const workflowStatus = source?.workflowStatus ?? "open";
    if (workflowStatus === "open") workflowOpen += 1;
    else if (
      ["nurse_treated", "needs_follow_up", "noise"].includes(workflowStatus)
    ) {
      workflowPending += 1;
    } else if (workflowStatus === "doctor_confirmed" || alert.resolved) {
      workflowResolved += 1;
    }
  }

  const statusCounts = countPatientStatus(ctx.patients);
  const attentionPatients = ctx.patients
    .map((patient) => {
      const criticalAlerts = ctx.alerts.filter(
        (alert) =>
          alert.patientId === patient.id && alert.severity === "critical",
      ).length;
      return {
        patient_id: patient.id,
        patient_name: patient.name,
        bed: patient.bed,
        critical_alerts: criticalAlerts,
        status: patient.status,
      };
    })
    .filter(
      (row) =>
        row.critical_alerts > 0 ||
        row.status === "critical" ||
        row.status === "at_risk",
    )
    .sort((left, right) => right.critical_alerts - left.critical_alerts)
    .slice(0, 5);

  const todayCritical = todayAlerts.filter(
    (alert) => alert.severity === "critical",
  ).length;
  const todayWarning = todayAlerts.filter(
    (alert) => alert.severity !== "critical",
  ).length;

  return {
    patient_status: statusCounts,
    alerts_today: {
      total: todayAlerts.length,
      critical: todayCritical,
      warning: todayWarning,
      open_unresolved: openUnresolved,
      pending_doctor: pendingDoctor,
    },
    workflow_period: {
      open: workflowOpen,
      pending_doctor: workflowPending,
      resolved: workflowResolved,
    },
    vitals_snapshot: await getDepartmentVitalsSnapshot(ctx.patients),
    attention_patients: attentionPatients,
    range: ctx.range,
    department_code: ctx.department,
  };
}

export async function getReportAlertTrend(query: ReportQuery): Promise<ReportAlertTrendResponse> {
  const ctx = await buildContext(query);

  const critical = ctx.dates.map(
    (date) =>
      ctx.alerts.filter(
        (alert) => alert.date === date && alert.severity === "critical",
      ).length,
  );
  const warning = ctx.dates.map(
    (date) =>
      ctx.alerts.filter(
        (alert) =>
          alert.date === date &&
          (alert.severity === "warning" || alert.severity === "info"),
      ).length,
  );

  return {
    dates: ctx.dates,
    critical,
    warning,
    range: ctx.range,
    department_code: ctx.department,
  };
}

export async function getReportAlertByType(
  query: ReportQuery,
): Promise<ReportAlertByTypeResponse> {
  const ctx = await buildContext(query);
  const alerts = ctx.alerts;

  const counts = new Map<AlertType, { count: number; severity: AlertSeverity }>();
  for (const alert of alerts) {
    const current = counts.get(alert.type);
    if (!current) {
      counts.set(alert.type, { count: 1, severity: alert.severity });
      continue;
    }
    counts.set(alert.type, {
      count: current.count + 1,
      severity:
        alert.severity === "critical" || current.severity === "critical"
          ? "critical"
          : "warning",
    });
  }

  const items = [...counts.entries()]
    .map(([type, value]) => ({
      type,
      count: value.count,
      severity: value.severity,
    }))
    .sort((left, right) => right.count - left.count);

  const top = items[0];
  const pct = top && alerts.length ? Math.round((top.count / alerts.length) * 100) : 0;

  return {
    items,
    top_insight: top
      ? text(
          `${getAlertTypeLabel(top.type, "vi")} chiếm ${pct}% tổng cảnh báo trong kỳ`,
          `${getAlertTypeLabel(top.type, "en")} accounts for ${pct}% of alerts in this period`,
        )
      : text(
          "Không có cảnh báo nào trong kỳ đã chọn",
          "No alerts in the selected period",
        ),
    range: ctx.range,
    department_code: ctx.department,
  };
}

export async function getReportHeatmap(query: ReportQuery): Promise<ReportHeatmapResponse> {
  const ctx = await buildContext(query);
  const rows = ctx.patients.map((patient) => {
    const days = ctx.dates.map((date) => {
      const dayAlerts = ctx.alerts.filter(
        (alert) => alert.patientId === patient.id && alert.date === date,
      );
      const criticalCount = dayAlerts.filter(
        (alert) => alert.severity === "critical",
      ).length;
      const warningCount = dayAlerts.filter(
        (alert) => alert.severity !== "critical",
      ).length;
      return {
        date,
        level: heatmapLevel(criticalCount, warningCount),
        critical_count: criticalCount,
        warning_count: warningCount,
        total_count: dayAlerts.length,
      };
    });

    return {
      patient_id: patient.id,
      patient_name: patient.name,
      days,
    };
  });

  return {
    dates: ctx.dates,
    rows,
    range: ctx.range,
    department_code: ctx.department,
  };
}

function sortPatients(
  rows: ReportPatientRiskRow[],
  sort: string,
): ReportPatientRiskRow[] {
  const copy = [...rows];
  switch (sort) {
    case "total_alerts_desc":
      return copy.sort((a, b) => b.total_alerts - a.total_alerts);
    case "name_asc":
      return copy.sort((a, b) => a.patient_name.localeCompare(b.patient_name));
    case "spo2_asc":
      return copy.sort((a, b) => (a.avg_spo2 ?? 0) - (b.avg_spo2 ?? 0));
    case "hr_desc":
      return copy.sort((a, b) => (b.avg_hr ?? 0) - (a.avg_hr ?? 0));
    case "status":
      return copy.sort((a, b) => a.status.localeCompare(b.status));
    case "critical_desc":
    default:
      return copy.sort((a, b) => b.critical_alerts - a.critical_alerts);
  }
}

export async function getReportPatientRisk(
  query: ReportQuery,
): Promise<ReportPatientRiskResponse> {
  const ctx = await buildContext(query);
  const pageSize = 10;
  const page = query.page ?? 1;
  const alerts = ctx.filterDate
    ? ctx.alerts.filter((alert) => alert.date === ctx.filterDate)
    : ctx.alerts;

  const allVitals = await getVitals();
  const rows: ReportPatientRiskRow[] = ctx.patients.map((patient) => {
    const patientAlerts = alerts.filter((alert) => alert.patientId === patient.id);
    const vitals = getPatientVitalAverages(patient.id, ctx.dates, allVitals);
    return {
      patient_id: patient.id,
      patient_name: patient.name,
      age: patient.age,
      bed: patient.bed,
      department_code: patient.departmentCode ?? "unknown",
      department_label:
        patient.departmentLabel ??
        departmentLabel(patient.departmentCode ?? "unknown"),
      total_alerts: patientAlerts.length,
      critical_alerts: patientAlerts.filter(
        (alert) => alert.severity === "critical",
      ).length,
      top_metric: topMetricForPatient(patient.id, alerts),
      avg_spo2: vitals.spo2,
      avg_hr: vitals.hr,
      status: patient.status,
    };
  });

  const sorted = sortPatients(rows, query.sort ?? "critical_desc");
  const start = (page - 1) * pageSize;

  return {
    patients: sorted.slice(start, start + pageSize),
    total: sorted.length,
    page,
    page_size: pageSize,
    range: ctx.range,
    department_code: ctx.department,
    filter_date: ctx.filterDate,
  };
}
