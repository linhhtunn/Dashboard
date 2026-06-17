"use client";

import Link from "next/link";
import { AlertTriangle, Check, Clock3, Eye, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AlertTreatmentModal } from "@/components/alerts/AlertTreatmentModal";
import { DoctorConfirmModal } from "@/components/alerts/DoctorConfirmModal";
import { useLocale } from "@/components/providers/LocaleProvider";
import { isAwaitingDoctor } from "@/lib/alerts-filters";
import {
  clearAlertPopupState,
  dismissAlertTemporarily,
  markAlertViewed,
  pickAlertForPopup,
  readAlertPopupState,
} from "@/lib/alert-popup-state";
import { useClinicalPersona } from "@/lib/clinical-persona";
import { getAlertTypeLabel, getMetricLabel } from "@/lib/i18n";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import { alertRepository } from "@/lib/repositories/alert.repository";
import { patientRepository } from "@/lib/repositories/patient.repository";
import { shiftRepository } from "@/lib/repositories/shift.repository";
import type { Alert, AlertSeverity, Patient, ShiftStaffMember } from "@/types";

const POLL_INTERVAL_MS = 30_000;

const severityStyles: Record<
  AlertSeverity,
  { border: string; headerBg: string; badgeBg: string; text: string }
> = {
  critical: {
    border: "border-[color:rgba(229,72,77,0.26)]",
    headerBg: "bg-[color:rgba(229,72,77,0.08)]",
    badgeBg: "bg-[color:rgba(229,72,77,0.1)]",
    text: "text-[color:var(--cs-danger)]",
  },
  warning: {
    border: "border-[color:rgba(245,179,0,0.28)]",
    headerBg: "bg-[color:rgba(245,179,0,0.1)]",
    badgeBg: "bg-[color:rgba(245,179,0,0.14)]",
    text: "text-[color:#8a6100]",
  },
  info: {
    border: "border-[color:rgba(13,71,161,0.2)]",
    headerBg: "bg-[color:rgba(13,71,161,0.06)]",
    badgeBg: "bg-[color:rgba(13,71,161,0.1)]",
    text: "text-[color:var(--cs-primary)]",
  },
};

export function GlobalAlertModal() {
  const { locale } = useLocale();
  const ui = useClinicalUi();
  const { operatorRole, isAdmin } = useClinicalPersona();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [popupTick, setPopupTick] = useState(0);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [floorNurses, setFloorNurses] = useState<ShiftStaffMember[]>([]);
  const [treatmentOpen, setTreatmentOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refreshAlerts = useCallback(async () => {
    const items = await alertRepository.listOpen();
    setAlerts(items);
    setPopupTick(Date.now());
  }, []);

  useEffect(() => {
    if (isAdmin) return undefined;

    let cancelled = false;
    const load = async () => {
      await refreshAlerts().catch(() => undefined);
    };
    void load();

    const timer = window.setInterval(() => {
      if (!cancelled) void refreshAlerts().catch(() => undefined);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isAdmin, refreshAlerts]);

  useEffect(() => {
    if (isAdmin) return;
    void shiftRepository
      .listStaff()
      .then((staff) => {
        setFloorNurses(staff.filter((member) => member.role === "floor_nurse"));
      })
      .catch(() => undefined);
  }, [isAdmin]);

  const alert = useMemo(() => {
    if (isAdmin) return null;
    const state = readAlertPopupState();
    return pickAlertForPopup(alerts, state, popupTick);
  }, [alerts, isAdmin, popupTick]);

  useEffect(() => {
    if (!alert) return;
    markAlertViewed(alert.id);
    let cancelled = false;
    void patientRepository
      .findById(alert.patientId)
      .then((item) => {
        if (!cancelled) setPatient(item);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [alert]);

  const dismissPopup = useCallback(() => {
    if (!alert) return;
    dismissAlertTemporarily(alert.id);
    setTreatmentOpen(false);
    setConfirmOpen(false);
    setPopupTick(Date.now());
  }, [alert]);

  async function afterWorkflowAction() {
    if (!alert) return;
    clearAlertPopupState(alert.id);
    setTreatmentOpen(false);
    setConfirmOpen(false);
    await refreshAlerts().catch(() => undefined);
  }

  function handleConfirmResolved() {
    if (!alert) return;

    if (operatorRole === "doctor" && isAwaitingDoctor(alert)) {
      setConfirmOpen(true);
      return;
    }

    if (operatorRole === "coordinator" && alert.workflowStatus === "open") {
      setTreatmentOpen(true);
    }
  }

  if (isAdmin || !alert) return null;

  const styles = severityStyles[alert.severity];
  const primaryEvidence = alert.evidence.find((item) => item.value !== undefined);
  const awaitingDoctor = isAwaitingDoctor(alert);
  const canTreat = operatorRole === "coordinator" && alert.workflowStatus === "open";
  const canDoctorConfirm = operatorRole === "doctor" && awaitingDoctor;
  const confirmLabel = canDoctorConfirm ? ui.alerts.doctorConfirm : ui.alerts.recordTreatment;

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-[80] overflow-hidden">
        <div
          className={[
            "pointer-events-auto absolute right-3 top-[72px] w-[min(460px,calc(100%-24px))] overflow-hidden rounded-[1.25rem] border bg-white/96 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:right-5",
            styles.border,
          ].join(" ")}
        >
          <div
            className={[
              "flex items-center justify-between gap-3 border-b border-white/50 px-4 py-3",
              styles.headerBg,
            ].join(" ")}
          >
            <div className={["flex items-center gap-2", styles.text].join(" ")}>
              <span
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  styles.badgeBg,
                ].join(" ")}
              >
                <AlertTriangle className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.16em]">
                  {locale === "vi" ? "Cảnh báo" : "Alert"}
                </p>
                <p className="text-[11px] text-[color:var(--cs-text-soft)]">
                  {locale === "vi"
                    ? "Chưa xem, realtime hoặc cần nhắc lại"
                    : "Unviewed, realtime, or due for reminder"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissPopup}
              className="flex h-8 items-center gap-1.5 rounded-[0.65rem] px-2 text-[11px] font-semibold text-[color:var(--cs-text-soft)] hover:bg-white"
            >
              <X className="h-3.5 w-3.5" />
              {locale === "vi" ? "Đóng tạm" : "Dismiss"}
            </button>
          </div>

          <div className="space-y-3 px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] text-[color:var(--cs-text-soft)]">
                  {locale === "vi" ? "Bệnh nhân" : "Patient"}
                </p>
                <p className="mt-0.5 text-[1rem] font-semibold text-[color:var(--cs-heading)]">
                  {patient?.name ?? alert.patientId}
                </p>
              </div>
              <span
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  styles.badgeBg,
                  styles.text,
                ].join(" ")}
              >
                <Clock3 className="h-3.5 w-3.5" />
                {new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(alert.timestamp))}
              </span>
            </div>

            <div
              className={[
                "rounded-[0.9rem] border px-3.5 py-3",
                styles.border,
                styles.headerBg,
              ].join(" ")}
            >
              <p className={["text-[13px] font-semibold", styles.text].join(" ")}>
                {getAlertTypeLabel(alert.type, locale)}
              </p>
              {primaryEvidence?.metric ? (
                <p className="mt-1 text-[13px] text-[color:var(--cs-text)]">
                  {getMetricLabel(primaryEvidence.metric, locale)}:{" "}
                  <strong>
                    {primaryEvidence.value}
                    {primaryEvidence.unit}
                  </strong>
                  {primaryEvidence.comparisonValue !== undefined
                    ? locale === "vi"
                      ? ` (mức cơ sở ${primaryEvidence.comparisonValue}${primaryEvidence.unit ?? ""})`
                      : ` (baseline ${primaryEvidence.comparisonValue}${primaryEvidence.unit ?? ""})`
                    : ""}
                </p>
              ) : null}
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--cs-text-soft)]">
                {locale === "vi" ? "AI giải thích ngắn" : "Short AI explanation"}
              </p>
              <p className="mt-1 text-[13px] leading-5 text-[color:var(--cs-text)]">
                {locale === "vi"
                  ? "Tín hiệu bất thường xuất hiện đồng thời với thay đổi chỉ số sinh tồn. Cần kiểm tra thực tế và xác nhận tình trạng người bệnh."
                  : "The abnormal signal coincides with a vital-sign change. Verify the patient in person and confirm the clinical status."}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={dismissPopup}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[0.7rem] border border-[color:var(--cs-primary)] bg-white px-3 text-[12px] font-semibold text-[color:var(--cs-primary)]"
              >
                <Eye className="h-4 w-4" />
                {locale === "vi" ? "Đã xem - xem xét thêm" : "Seen - review later"}
              </button>
              {canTreat || canDoctorConfirm ? (
                <button
                  type="button"
                  onClick={handleConfirmResolved}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[0.7rem] bg-[color:var(--cs-primary)] px-3 text-[12px] font-semibold text-white"
                >
                  <Check className="h-4 w-4" />
                  {confirmLabel}
                </button>
              ) : awaitingDoctor ? (
                <span className="inline-flex h-10 items-center justify-center rounded-[0.7rem] bg-[color:rgba(13,71,161,0.08)] px-3 text-center text-[11px] font-semibold text-[color:var(--cs-primary)]">
                  {ui.workflow.pendingDoctor}
                </span>
              ) : (
                <Link
                  href="/alerts"
                  onClick={dismissPopup}
                  className="inline-flex h-10 items-center justify-center rounded-[0.7rem] bg-[color:rgba(13,71,161,0.08)] px-3 text-center text-[11px] font-semibold text-[color:var(--cs-primary)]"
                >
                  {ui.nav.alerts}
                </Link>
              )}
            </div>

            <Link
              href={`/patients/${alert.patientId}`}
              onClick={dismissPopup}
              className="block text-center text-[11px] font-semibold text-[color:var(--cs-primary)]"
            >
              {locale === "vi" ? "Mở hồ sơ bệnh nhân" : "Open patient record"}
            </Link>
          </div>
        </div>
      </div>

      {treatmentOpen ? (
        <AlertTreatmentModal
          alert={alert}
          patientName={patient?.name}
          floorNurses={floorNurses}
          open
          submitting={submitting}
          onClose={() => setTreatmentOpen(false)}
          onSubmitTreat={async (payload) => {
            setSubmitting(true);
            try {
              const action =
                payload.outcome === "needs_follow_up"
                  ? ({
                      action: "needs_follow_up" as const,
                      ...payload,
                      followUpNote: payload.followUpNote,
                    } as const)
                  : ({
                      action: "nurse_treat" as const,
                      ...payload,
                    } as const);
              await alertRepository.submitAction(alert.id, action, operatorRole);
              await afterWorkflowAction();
            } finally {
              setSubmitting(false);
            }
          }}
          onSubmitNoise={async (description) => {
            setSubmitting(true);
            try {
              await alertRepository.submitAction(
                alert.id,
                { action: "mark_noise", description },
                operatorRole,
              );
              await afterWorkflowAction();
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}

      {confirmOpen ? (
        <DoctorConfirmModal
          alert={alert}
          patientName={patient?.name}
          open
          submitting={submitting}
          onClose={() => setConfirmOpen(false)}
          onConfirm={async (conclusion) => {
            setSubmitting(true);
            try {
              await alertRepository.submitAction(
                alert.id,
                { action: "doctor_confirm", conclusion },
                "doctor",
              );
              await afterWorkflowAction();
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}
    </>
  );
}
