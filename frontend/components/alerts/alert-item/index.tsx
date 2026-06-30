"use client";

import { useState } from "react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { getAlertSeverityPresentation } from "@/lib/alert-severity";
import { useOperatorRole } from "@/lib/operator-role";
import { alertRepository } from "@/lib/repositories/alert.repository";
import {
  formatAlertTimestamp,
  getAlertSeverityLabel,
  getAlertTypeLabel,
  getMetricLabel,
} from "@/lib/i18n";
import type { Alert } from "@/types";

type AlertItemProps = {
  alert: Alert;
  compact?: boolean;
};

export function AlertItem({ alert, compact = false }: AlertItemProps) {
  const { locale } = useLocale();
  const { role } = useOperatorRole();
  const [acknowledged, setAcknowledged] = useState(alert.acknowledged);
  const [acknowledging, setAcknowledging] = useState(false);
  const severity = getAlertSeverityPresentation(alert.severity);
  const evidenceLines = formatEvidence(alert, locale);

  return (
    <article
      className={[
        "relative overflow-hidden rounded-[0.85rem] border shadow-[0_16px_34px_rgba(15,23,42,0.05)]",
        compact ? "px-2 py-2" : "rounded-[1.15rem] px-3.5 py-3.5",
        severity.cardClasses,
      ].join(" ")}
    >
      <div
        className={[
          "absolute inset-y-0 left-0 bg-gradient-to-b",
          compact ? "w-1" : "w-1.5",
          severity.railClass,
        ].join(" ")}
        aria-hidden="true"
      />

      <div className={`flex flex-col pl-1.5 ${compact ? "gap-1.5" : "gap-2.5 sm:flex-row sm:items-start sm:justify-between"}`}>
        <div className={`min-w-0 ${compact ? "space-y-1" : "space-y-1.5"}`}>
          <div className={`flex flex-wrap items-center ${compact ? "gap-1" : "gap-2"}`}>
            <span
              className={[
                "inline-flex items-center rounded-full border font-semibold",
                compact
                  ? "gap-1 px-1.5 py-0.5 text-[8px]"
                  : "gap-2 px-2.5 py-1 text-[11px]",
                severity.badgeClasses,
              ].join(" ")}
            >
              <span className={["rounded-full", compact ? "h-1.5 w-1.5" : "h-2 w-2", severity.dotClass].join(" ")} />
              {getAlertSeverityLabel(alert.severity, locale)}
            </span>

            {!compact ? (
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-[color:var(--cs-heading)]">
                {locale === "vi"
                  ? severity.priorityLabel[locale]
                  : `${severity.priorityRank} · ${severity.priorityLabel[locale]}`}
              </span>
            ) : null}

            <span className={`${compact ? "text-[7px]" : "text-[11px]"} text-[color:var(--cs-text-soft)]`}>
              {formatAlertTimestamp(alert.timestamp, locale)}
            </span>
          </div>

          <p className={`${compact ? "text-[9px]" : "text-[15px]"} font-semibold text-[color:var(--cs-heading)]`}>
            {getAlertTypeLabel(alert.type, locale)}
          </p>

          {!compact ? (
            <div className="space-y-0.5">
              {evidenceLines.map((evidence) => (
                <p key={evidence} className="text-[13px] text-[color:var(--cs-text)]">
                  {evidence}
                </p>
              ))}
            </div>
          ) : (
            <p className="line-clamp-2 text-[8px] leading-snug text-[color:var(--cs-text)]">
              {evidenceLines[0]}
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={acknowledged || acknowledging || role !== "coordinator"}
          onClick={async () => {
            setAcknowledging(true);
            try {
              await alertRepository.submitAction(alert.id, { action: "acknowledge" }, role);
              setAcknowledged(true);
            } finally {
              setAcknowledging(false);
            }
          }}
          className={[
            "shrink-0 rounded-full border border-[color:rgba(13,71,161,0.14)] bg-white/78 font-semibold text-[color:var(--cs-primary)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60",
            compact ? "h-6 px-2 text-[8px]" : "h-9 px-3.5 text-[13px]",
          ].join(" ")}
        >
          {acknowledging
            ? locale === "vi" ? "Äang ghi nháº­n..." : "Acknowledging..."
            : acknowledged
            ? locale === "vi"
              ? "Đã ghi nhận"
              : "Acknowledged"
            : locale === "vi"
              ? "Xác nhận"
              : "Confirm"}
        </button>
      </div>
    </article>
  );
}

function formatEvidence(alert: Alert, locale: "vi" | "en") {
  if (alert.evidence.length === 0) {
    return [
      locale === "vi"
        ? "Dấu hiệu bất thường cần theo dõi thêm."
        : "Abnormal signal requires additional monitoring.",
    ];
  }

  return alert.evidence.map((evidence) => {
    const metricName = evidence.metric
      ? getMetricLabel(evidence.metric, locale)
      : locale === "vi"
        ? "Chỉ số theo dõi"
        : "Monitored metric";
    const value =
      evidence.value !== undefined
        ? ` ${evidence.value}${evidence.unit ? ` ${evidence.unit}` : ""}`
        : "";

    return locale === "vi"
      ? `${metricName} đang ở mức${value}. Cần bác sĩ xác nhận thêm bối cảnh lâm sàng.`
      : `${metricName} is currently at${value}. Please confirm the broader clinical context.`;
  });
}
