"use client";

import { Check, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { useLocale } from "@/components/providers/LocaleProvider";
import { getAlertSeverityPresentation } from "@/lib/alert-severity";
import { getAlertStatus } from "@/lib/alerts-filters";
import {
  formatAlertTimestamp,
  getAlertTypeLabel,
  getMetricLabel,
} from "@/lib/i18n";
import type { Alert, Patient } from "@/types";

type AlertHistoryRowProps = {
  alert: Alert;
  patient?: Patient;
  resolvedIds: string[];
  onResolve: () => void;
  onAskAI: () => void;
};

export function AlertHistoryRow({
  alert,
  patient,
  resolvedIds,
  onResolve,
  onAskAI,
}: AlertHistoryRowProps) {
  const { locale } = useLocale();
  const severity = getAlertSeverityPresentation(alert.severity);
  const evidence = alert.evidence.find((item) => item.value !== undefined);
  const resolved = resolvedIds.includes(alert.id);
  const status = getAlertStatus(alert, resolvedIds);

  const stateLabel =
    status === "resolved"
      ? locale === "vi"
        ? "Đã xử lý"
        : "Resolved"
      : status === "review"
        ? locale === "vi"
          ? "Cần xem lại"
          : "Review"
        : locale === "vi"
          ? "Chưa xử lý"
          : "Open";

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
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-[color:var(--cs-text)]">
            {evidence?.metric
              ? `${getMetricLabel(evidence.metric, locale)} ${evidence.value}${evidence.unit ?? ""}`
              : locale === "vi"
                ? "Tín hiệu cần xác nhận lâm sàng."
                : "Signal requires clinical confirmation."}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onAskAI}
            className="dashboard-input inline-flex h-8 items-center gap-1 rounded-[0.6rem] px-2.5 text-[10px] font-semibold text-[color:var(--cs-primary)]"
          >
            <Sparkles className="h-3 w-3" />
            {locale === "vi" ? "Hỏi AI" : "Ask AI"}
          </button>
          <Link
            href={`/patients/${alert.patientId}`}
            className="dashboard-input inline-flex h-8 items-center gap-1 rounded-[0.6rem] px-2.5 text-[10px] font-semibold text-[color:var(--cs-primary)]"
          >
            {locale === "vi" ? "Chi tiết" : "Details"}
            <ChevronRight className="h-3 w-3" />
          </Link>
          <button
            type="button"
            disabled={resolved}
            onClick={onResolve}
            className="inline-flex h-8 items-center gap-1 rounded-[0.6rem] bg-[linear-gradient(135deg,var(--cs-primary),var(--cs-teal))] px-2.5 text-[10px] font-semibold text-white shadow-[0_12px_28px_rgba(13,71,161,0.18)] disabled:opacity-60"
          >
            <Check className="h-3 w-3" />
            {resolved
              ? locale === "vi"
                ? "Đã xử lý"
                : "Resolved"
              : locale === "vi"
                ? "Xác nhận"
                : "Resolve"}
          </button>
        </div>
      </div>
    </article>
  );
}
