"use client";

import Link from "next/link";
import { AlertTriangle, Check, Clock3, Eye, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { getAlertTypeLabel, getMetricLabel } from "@/lib/i18n";
import { alertRepository } from "@/lib/repositories/alert.repository";
import { patientRepository } from "@/lib/repositories/patient.repository";
import type { Alert, Patient } from "@/types";

const SESSION_KEY = "care-signal-hidden-alerts";

export function GlobalAlertModal() {
  const { locale } = useLocale();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [hiddenIds, setHiddenIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = window.sessionStorage.getItem(SESSION_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  });

  useEffect(() => {
    let cancelled = false;
    void alertRepository.listOpen().then((items) => {
      if (!cancelled) setAlerts(items);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const alert = useMemo(
    () =>
      alerts.find(
        (item) => item.severity === "critical" && !hiddenIds.includes(item.id),
      ) ?? null,
    [alerts, hiddenIds],
  );

  useEffect(() => {
    if (!alert) return;
    let cancelled = false;
    void patientRepository.findById(alert.patientId).then((item) => {
      if (!cancelled) setPatient(item);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [alert]);

  const hideAlert = () => {
    if (!alert) return;
    const next = [...hiddenIds, alert.id];
    setHiddenIds(next);
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
  };

  if (!alert) return null;

  const primaryEvidence = alert.evidence.find((item) => item.value !== undefined);

  return (
    <div className="pointer-events-none absolute inset-0 z-[80] overflow-hidden">
      <div className="pointer-events-auto absolute right-3 top-[72px] w-[min(460px,calc(100%-24px))] overflow-hidden rounded-[1.25rem] border border-[color:rgba(229,72,77,0.26)] bg-white/96 shadow-[0_24px_70px_rgba(86,18,24,0.24)] backdrop-blur-xl sm:right-5">
        <div className="flex items-center justify-between gap-3 border-b border-[color:rgba(229,72,77,0.14)] bg-[color:rgba(229,72,77,0.08)] px-4 py-3">
          <div className="flex items-center gap-2 text-[color:var(--cs-danger)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:rgba(229,72,77,0.12)]">
              <AlertTriangle className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.16em]">
                {locale === "vi" ? "Cảnh báo" : "Alert"}
              </p>
              <p className="text-[11px] text-[color:var(--cs-text-soft)]">
                {locale === "vi" ? "Cần xác nhận lâm sàng" : "Clinical confirmation required"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={hideAlert}
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:rgba(229,72,77,0.1)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--cs-danger)]">
              <Clock3 className="h-3.5 w-3.5" />
              {new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(alert.timestamp))}
            </span>
          </div>

          <div className="rounded-[0.9rem] border border-[color:rgba(229,72,77,0.14)] bg-[color:rgba(229,72,77,0.05)] px-3.5 py-3">
            <p className="text-[13px] font-semibold text-[color:var(--cs-danger)]">
              {getAlertTypeLabel(alert.type, locale)}
            </p>
            {primaryEvidence?.metric ? (
              <p className="mt-1 text-[13px] text-[color:var(--cs-text)]">
                {getMetricLabel(primaryEvidence.metric, locale)}:{" "}
                <strong>{primaryEvidence.value}{primaryEvidence.unit}</strong>
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
              onClick={hideAlert}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[0.7rem] border border-[color:var(--cs-primary)] bg-white px-3 text-[12px] font-semibold text-[color:var(--cs-primary)]"
            >
              <Eye className="h-4 w-4" />
              {locale === "vi" ? "Đã xem - xem xét thêm" : "Seen - review later"}
            </button>
            <button
              type="button"
              onClick={hideAlert}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[0.7rem] bg-[color:var(--cs-primary)] px-3 text-[12px] font-semibold text-white"
            >
              <Check className="h-4 w-4" />
              {locale === "vi" ? "Xác nhận đã xử lý" : "Confirm resolved"}
            </button>
          </div>

          <Link
            href={`/patients/${alert.patientId}`}
            onClick={hideAlert}
            className="block text-center text-[11px] font-semibold text-[color:var(--cs-primary)]"
          >
            {locale === "vi" ? "Mở hồ sơ bệnh nhân" : "Open patient record"}
          </Link>
        </div>
      </div>
    </div>
  );
}
