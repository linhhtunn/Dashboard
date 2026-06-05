"use client";

import { useState } from "react";

import { useLocale } from "@/components/providers/LocaleProvider";
import {
  formatAlertTimestamp,
  getAlertSeverityLabel,
  getAlertTypeLabel,
  getMetricLabel,
} from "@/lib/i18n";
import type { Alert, AlertSeverity } from "@/types";

type AlertItemProps = {
  alert: Alert;
};

const severityStyles: Record<
  AlertSeverity,
  {
    classes: string;
    dot: string;
  }
> = {
  info: {
    classes:
      "border-[color:rgba(13,71,161,0.18)] bg-[color:rgba(13,71,161,0.08)] text-[color:var(--cs-primary)]",
    dot: "bg-[color:var(--cs-primary)]",
  },
  warning: {
    classes:
      "border-[color:rgba(245,179,0,0.22)] bg-[color:rgba(245,179,0,0.14)] text-[color:#9a6700]",
    dot: "bg-[color:var(--cs-gold)]",
  },
  critical: {
    classes:
      "border-[color:rgba(229,72,77,0.22)] bg-[color:rgba(229,72,77,0.12)] text-[color:var(--cs-danger)]",
    dot: "bg-[color:var(--cs-danger)]",
  },
};

export function AlertItem({ alert }: AlertItemProps) {
  const { locale } = useLocale();
  const [acknowledged, setAcknowledged] = useState(alert.acknowledged);
  const severity = severityStyles[alert.severity];

  return (
    <article className="dashboard-surface rounded-[1.15rem] px-3.5 py-3.5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                severity.classes,
              ].join(" ")}
            >
              <span className={["h-2 w-2 rounded-full", severity.dot].join(" ")} />
              {getAlertSeverityLabel(alert.severity, locale)}
            </span>
            <span className="text-[11px] text-[color:var(--cs-text-soft)]">
              {formatAlertTimestamp(alert.timestamp, locale)}
            </span>
          </div>

          <p className="text-[15px] font-semibold text-[color:var(--cs-heading)]">
            {getAlertTypeLabel(alert.type, locale)}
          </p>

          <div className="space-y-0.5">
            {formatEvidence(alert, locale).map((evidence) => (
              <p key={evidence} className="text-[13px] text-[color:var(--cs-text)]">
                {evidence}
              </p>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={acknowledged}
          onClick={() => setAcknowledged(true)}
          className="h-9 shrink-0 rounded-full border border-[color:rgba(13,71,161,0.14)] bg-white/72 px-3.5 text-[13px] font-semibold text-[color:var(--cs-primary)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {acknowledged
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
