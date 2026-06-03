"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { getMetricLabel } from "@/lib/i18n";
import type { MetricSummary, VitalMetric, VitalSignalSample } from "@/types";
import { VitalChart } from "../vital-chart";

type MetricCardProps = {
  summary: MetricSummary;
  vitals?: VitalSignalSample[];
  className?: string;
};

type IconProps = {
  className?: string;
  style?: React.CSSProperties;
};

const metricColors: Record<VitalMetric, string> = {
  heart_rate: "#0D47A1",
  hrv_rmssd: "#009688",
  spo2: "#009688",
  systolic_bp: "#F5B300",
  diastolic_bp: "#FB923C",
};

function HeartIcon({ className = "", style }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      style={style}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="M19.5 12.6 12 20l-7.5-7.4a5 5 0 0 1 7.1-7.1L12 6l.4-.5a5 5 0 0 1 7.1 7.1Z" />
    </svg>
  );
}

function PulseIcon({ className = "", style }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      style={style}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="M3 12h4l2-4 3 8 2-4h7" />
    </svg>
  );
}

function ShieldIcon({ className = "", style }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      style={style}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="M12 3 5 6v5c0 4.5 3 7.5 7 10 4-2.5 7-5.5 7-10V6l-7-3Z" />
    </svg>
  );
}

const metricIcons: Record<VitalMetric, (props: IconProps) => React.ReactNode> = {
  heart_rate: HeartIcon,
  hrv_rmssd: PulseIcon,
  spo2: ShieldIcon,
  systolic_bp: PulseIcon,
  diastolic_bp: PulseIcon,
};

function formatTrend(summary: MetricSummary, locale: "vi" | "en") {
  if (summary.changePct === undefined || summary.trend === "stable") {
    return locale === "vi"
      ? "Ổn định so với 15 phút trước"
      : "Stable versus 15 minutes ago";
  }

  const direction = summary.trend === "down" ? "↓" : "↑";
  return locale === "vi"
    ? `${direction} ${Math.abs(summary.changePct)}% so với 15 phút trước`
    : `${direction} ${Math.abs(summary.changePct)}% vs 15 minutes ago`;
}

export function MetricCard({
  summary,
  vitals = [],
  className = "",
}: MetricCardProps) {
  const { locale } = useLocale();
  const Icon = metricIcons[summary.metric];
  const metricColor = metricColors[summary.metric];

  return (
    <article
      className={[
        "dashboard-surface rounded-[1.35rem] px-4 py-4",
        className,
      ].join(" ")}
    >
      <div className="mb-4 flex min-w-0 items-center gap-3">
        <Icon className="h-5 w-5 shrink-0" style={{ color: metricColor }} />
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-[color:var(--cs-heading)]">
            {getMetricLabel(summary.metric, locale)}
          </h3>
          <p className="text-sm text-[color:var(--cs-text-soft)]">
            {formatTrend(summary, locale)}
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-end gap-2">
        <p className="text-[2rem] font-semibold leading-none text-[color:var(--cs-heading)]">
          {summary.displayValue ?? summary.currentValue}
        </p>
        <span className="pb-1 text-sm text-[color:var(--cs-text-soft)]">
          {summary.unit}
        </span>
      </div>

      <VitalChart data={vitals} metric={summary.metric} height={210} />
    </article>
  );
}
