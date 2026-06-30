import { getPatientStatusLabel } from "@/lib/i18n";
import type { Alert, AlertSeverity, AlertWorkflowStatus, Patient, PatientStatus } from "@/types";

export type AlertStatusFilter =
  | "all"
  | "open"
  | "pending_doctor"
  | "needs_follow_up"
  | "noise"
  | "resolved";
export type SeverityBucket = "critical" | "warning";
export type PatientSeverityFilter = "all" | PatientStatus;

export const patientSeverityOrder: PatientStatus[] = [
  "critical",
  "at_risk",
  "recent_symptom",
  "healthy",
];

export type AlertZoneFilters = {
  query: string;
  patientId: string;
  patientSeverity: PatientSeverityFilter;
  status: AlertStatusFilter;
};

export const defaultAlertZoneFilters: AlertZoneFilters = {
  query: "",
  patientId: "all",
  patientSeverity: "all",
  status: "all",
};

export function getWorkflowFilterBucket(
  workflowStatus: AlertWorkflowStatus,
): Exclude<AlertStatusFilter, "all"> {
  switch (workflowStatus) {
    case "doctor_confirmed":
      return "resolved";
    case "nurse_treated":
    case "suspected_noise":
      return "pending_doctor";
    case "noise":
      return "noise";
    case "needs_follow_up":
      return "needs_follow_up";
    case "open":
    case "acknowledged":
    default:
      return "open";
  }
}

export function matchesSeverityBucket(
  severity: AlertSeverity,
  bucket: SeverityBucket,
): boolean {
  if (bucket === "critical") return severity === "critical";
  return severity === "warning" || severity === "info";
}

export function filterAlertsByZone(
  alerts: Alert[],
  bucket: SeverityBucket,
  filters: AlertZoneFilters,
  patients: Record<string, Patient>,
  locale: "vi" | "en",
): Alert[] {
  return alerts.filter((alert) => {
    if (!matchesSeverityBucket(alert.severity, bucket)) return false;

    const patient = patients[alert.patientId];
    const currentStatus = getWorkflowFilterBucket(alert.workflowStatus);

    if (filters.status !== "all" && filters.status !== currentStatus) {
      return false;
    }
    if (filters.patientId !== "all" && filters.patientId !== alert.patientId) {
      return false;
    }
    if (
      filters.patientSeverity !== "all" &&
      patient?.status !== filters.patientSeverity
    ) {
      return false;
    }
    if (filters.query) {
      const needle = filters.query.toLowerCase();
      const matchesPatient = patient?.name.toLowerCase().includes(needle);
      const matchesSeverity = patient
        ? getPatientStatusLabel(patient.status, locale)
            .toLowerCase()
            .includes(needle)
        : false;
      if (!matchesPatient && !matchesSeverity) return false;
    }

    return true;
  });
}

export function isAwaitingDoctor(alert: Alert): boolean {
  return ["nurse_treated", "suspected_noise", "needs_follow_up"].includes(alert.workflowStatus);
}
