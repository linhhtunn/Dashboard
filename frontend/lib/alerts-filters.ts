import { getPatientStatusLabel } from "@/lib/i18n";
import type { Alert, AlertSeverity, Patient, PatientStatus } from "@/types";

export type AlertStatus = "open" | "review" | "resolved";
export type AlertStatusFilter = "all" | AlertStatus;
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

export function getAlertStatus(
  alert: Alert,
  resolvedIds: string[],
): AlertStatus {
  if (resolvedIds.includes(alert.id)) return "resolved";
  if (alert.acknowledged) return "review";
  return "open";
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
  resolvedIds: string[],
  locale: "vi" | "en",
): Alert[] {
  return alerts.filter((alert) => {
    if (!matchesSeverityBucket(alert.severity, bucket)) return false;

    const patient = patients[alert.patientId];
    const currentStatus = getAlertStatus(alert, resolvedIds);

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
