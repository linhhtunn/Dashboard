"use client";

import { ChevronRight, ClipboardCheck, Sparkles, Stethoscope } from "lucide-react";
import Link from "next/link";

import { useLocale } from "@/components/providers/LocaleProvider";
import { getAlertSeverityPresentation } from "@/lib/alert-severity";
import { getWorkflowFilterBucket, isAwaitingDoctor } from "@/lib/alerts-filters";
import {
  formatAlertTimestamp,
  getAlertTypeLabel,
  getMetricLabel,
} from "@/lib/i18n";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import { getZoneLabel } from "@/lib/staff-ui";
import type { Alert, OperatorRole, Patient } from "@/types";

type AlertHistoryRowProps = {
  alert: Alert;
  patient?: Patient;
  operatorRole: OperatorRole;
  onTreat: () => void;
  onDoctorConfirm: () => void;
  onAskAI: () => void;
};

export function AlertHistoryRow({
  alert,
  patient,
  operatorRole,
  onTreat,
  onDoctorConfirm,
  onAskAI,
}: AlertHistoryRowProps) {
  const { locale } = useLocale();
  const ui = useClinicalUi();
  const severity = getAlertSeverityPresentation(alert.severity);
  const evidence = alert.evidence.find((item) => item.value !== undefined);
  const workflowBucket = getWorkflowFilterBucket(alert.workflowStatus);
  const workflowLabels = {
    open: ui.workflow.open,
    pending_doctor: ui.workflow.pendingDoctor,
    needs_follow_up: ui.workflow.followUp,
    noise: ui.workflow.noise,
    resolved: ui.workflow.resolved,
  } as const;
  const stateLabel = workflowLabels[workflowBucket];
  const resolved = alert.workflowStatus === "doctor_confirmed";
  const canTreat =
    operatorRole === "coordinator" && alert.workflowStatus === "open";
  const canDoctorConfirm =
    operatorRole === "doctor" && isAwaitingDoctor(alert);

  return (
    <article
      className={[
        "relative overflow-hidden rounded-[1.05rem] border p-3 shadow-[0_14px_34px_rgba(15,23,42,0.05)] backdrop-blur-[12px]",
        severity.cardClasses,
      ].join(" ")}
    >
      <span
        className={[
          "absolute inset-y-0 left-0 w-1 bg-gradient-to-b",
          severity.railClass,
        ].join(" ")}
      />
      <div className="grid gap-2.5 pl-1.5 lg:grid-cols-[72px_minmax(0,1fr)_auto] lg:items-center">
        <div>
          <p className="text-[11px] font-semibold text-[color:var(--cs-heading)]">
            {formatAlertTimestamp(alert.timestamp, locale)}
          </p>
          <span
            className={[
              "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold",
              severity.badgeClasses,
            ].join(" ")}
          >
            {stateLabel}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-[13px] font-semibold text-[color:var(--cs-heading)]">
              {patient?.name ?? alert.patientId}
            </h2>
            <span className="text-[11px] text-[color:var(--cs-text-soft)]">
              · {getAlertTypeLabel(alert.type, locale)}
            </span>
            {alert.assignedZoneCode ? (
              <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[9px] font-semibold text-[color:var(--cs-text-soft)]">
                {getZoneLabel(alert.assignedZoneCode, locale)}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-[color:var(--cs-text)]">
            {evidence?.metric
              ? `${getMetricLabel(evidence.metric, locale)} ${evidence.value}${evidence.unit ?? ""}`
              : ui.common.clinicalSignalFallback}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onAskAI}
            className="dashboard-input inline-flex h-8 items-center gap-1 rounded-[0.6rem] px-2.5 text-[10px] font-semibold text-[color:var(--cs-primary)]"
          >
            <Sparkles className="h-3 w-3" />
            {ui.alerts.askAi}
          </button>
          <Link
            href={`/patients/${alert.patientId}`}
            className="dashboard-input inline-flex h-8 items-center gap-1 rounded-[0.6rem] px-2.5 text-[10px] font-semibold text-[color:var(--cs-primary)]"
          >
            {ui.common.details}
            <ChevronRight className="h-3 w-3" />
          </Link>
          {canTreat ? (
            <button
              type="button"
              onClick={onTreat}
              className="inline-flex h-8 items-center gap-1 rounded-[0.6rem] bg-[linear-gradient(135deg,var(--cs-primary),var(--cs-teal))] px-2.5 text-[10px] font-semibold text-white shadow-[0_12px_28px_rgba(13,71,161,0.18)]"
            >
              <ClipboardCheck className="h-3 w-3" />
              {ui.alerts.recordTreatment}
            </button>
          ) : null}
          {canDoctorConfirm ? (
            <button
              type="button"
              onClick={onDoctorConfirm}
              className="inline-flex h-8 items-center gap-1 rounded-[0.6rem] bg-[linear-gradient(135deg,#8a6100,var(--cs-primary))] px-2.5 text-[10px] font-semibold text-white"
            >
              <Stethoscope className="h-3 w-3" />
              {ui.alerts.doctorConfirm}
            </button>
          ) : null}
          {resolved ? (
            <span className="inline-flex h-8 items-center rounded-[0.6rem] bg-white/60 px-2.5 text-[10px] font-semibold text-[color:var(--cs-text-soft)]">
              {ui.alerts.resolved}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
