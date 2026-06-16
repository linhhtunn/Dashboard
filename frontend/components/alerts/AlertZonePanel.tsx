"use client";

import { Filter, Search } from "lucide-react";

import { AlertHistoryRow } from "@/components/alerts/AlertHistoryRow";
import { useLocale } from "@/components/providers/LocaleProvider";
import {
  filterAlertsByZone,
  patientSeverityOrder,
  type AlertZoneFilters,
  type SeverityBucket,
} from "@/lib/alerts-filters";
import { getPatientStatusLabel } from "@/lib/i18n";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import type { Alert, OperatorRole, Patient } from "@/types";

type AlertZonePanelProps = {
  title: string;
  bucket: SeverityBucket;
  alerts: Alert[];
  patients: Record<string, Patient>;
  operatorRole: OperatorRole;
  filters: AlertZoneFilters;
  onFiltersChange: (filters: AlertZoneFilters) => void;
  onTreat: (alert: Alert) => void;
  onDoctorConfirm: (alert: Alert) => void;
  onAskAI: (alert: Alert) => void;
};

export function AlertZonePanel({
  title,
  bucket,
  alerts,
  patients,
  operatorRole,
  filters,
  onFiltersChange,
  onTreat,
  onDoctorConfirm,
  onAskAI,
}: AlertZonePanelProps) {
  const { locale } = useLocale();
  const ui = useClinicalUi();

  const zoneAlerts = alerts.filter((alert) =>
    bucket === "critical"
      ? alert.severity === "critical"
      : alert.severity === "warning" || alert.severity === "info",
  );

  const visibleAlerts = filterAlertsByZone(
    alerts,
    bucket,
    filters,
    patients,
    locale,
  );

  const zonePatients = Array.from(
    new Set(zoneAlerts.map((alert) => alert.patientId)),
  )
    .map((id) => patients[id])
    .filter((patient): patient is Patient => Boolean(patient));

  const zonePatientSeverities = patientSeverityOrder.filter((status) =>
    zoneAlerts.some(
      (alert) => patients[alert.patientId]?.status === status,
    ),
  );

  const statusOptions = [
    { value: "all", label: ui.alerts.filterAllStatus },
    { value: "open", label: ui.alerts.statusOpen },
    { value: "pending_doctor", label: ui.alerts.statusPendingDoctor },
    { value: "needs_follow_up", label: ui.alerts.statusFollowUp },
    { value: "noise", label: ui.alerts.statusNoise },
    { value: "resolved", label: ui.alerts.statusResolved },
  ] as const;

  return (
    <section className="dashboard-surface flex min-h-0 flex-col overflow-hidden rounded-[1.15rem]">
      <header className="shrink-0 border-b border-white/45 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[13px] font-semibold text-[color:var(--cs-heading)]">
            {title}
          </h2>
          <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--cs-text-soft)]">
            {visibleAlerts.length}/{zoneAlerts.length}
          </span>
        </div>

        <div className="mt-2 space-y-1.5">
          <label className="dashboard-input flex h-9 items-center gap-2 rounded-[0.65rem] px-2.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-[color:var(--cs-text-soft)]" />
            <input
              value={filters.query}
              onChange={(event) =>
                onFiltersChange({ ...filters, query: event.target.value })
              }
              placeholder={ui.alerts.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-[11px] outline-none"
            />
          </label>

          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
            <select
              value={filters.patientId}
              onChange={(event) =>
                onFiltersChange({ ...filters, patientId: event.target.value })
              }
              className="dashboard-input h-9 rounded-[0.65rem] px-2 text-[11px]"
            >
              <option value="all">{ui.alerts.filterAllPatients}</option>
              {zonePatients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
            <select
              value={filters.patientSeverity}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  patientSeverity: event.target.value as AlertZoneFilters["patientSeverity"],
                })
              }
              className="dashboard-input h-9 rounded-[0.65rem] px-2 text-[11px]"
            >
              <option value="all">{ui.alerts.filterAllSeverity}</option>
              {zonePatientSeverities.map((status) => (
                <option key={status} value={status}>
                  {getPatientStatusLabel(status, locale)}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  status: event.target.value as AlertZoneFilters["status"],
                })
              }
              className="dashboard-input h-9 rounded-[0.65rem] px-2 text-[11px]"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="dashboard-scroll-area min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
        {visibleAlerts.length ? (
          visibleAlerts.map((alert) => (
            <AlertHistoryRow
              key={alert.id}
              alert={alert}
              patient={patients[alert.patientId]}
              operatorRole={operatorRole}
              onTreat={() => onTreat(alert)}
              onDoctorConfirm={() => onDoctorConfirm(alert)}
              onAskAI={() => onAskAI(alert)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center text-[12px] text-[color:var(--cs-text-soft)]">
            <Filter className="mb-2 h-5 w-5" />
            {ui.alerts.emptyZone}
          </div>
        )}
      </div>
    </section>
  );
}
