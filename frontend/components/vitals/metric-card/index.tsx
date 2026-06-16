"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { getMetricLabel } from "@/lib/i18n";
import type { MetricSummary, VitalMetric, VitalSignalSample } from "@/types";
import { VitalChart } from "../vital-chart";

type MetricCardProps = {
  summary: MetricSummary;
  vitals?: VitalSignalSample[];
  className?: string;
  chartHeight?: number;
  compact?: boolean;
};

type IconProps = {
  className?: string;
  style?: React.CSSProperties;
};

const metricColors: Record<VitalMetric, string> = {
  heart_rate: "#0D47A1",
  respiratory_rate: "#009688",
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
  respiratory_rate: PulseIcon,
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
  chartHeight = 300,
  compact = false,
}: MetricCardProps) {
  const { locale } = useLocale();
  const Icon = metricIcons[summary.metric];
  const metricColor = metricColors[summary.metric];

  return (
    <article
      className={[
        "dashboard-surface flex h-full min-h-0 flex-col overflow-hidden rounded-[1.15rem]",
        compact ? "px-2 py-1.5" : "px-3.5 py-3.5",
        className,
      ].join(" ")}
    >
      <div className={`${compact ? "mb-1" : "mb-3"} flex min-w-0 shrink-0 items-center gap-2`}>
        <Icon
          className={compact ? "h-3.5 w-3.5 shrink-0" : "h-4.5 w-4.5 shrink-0"}
          style={{ color: metricColor }}
        />
        <div className="min-w-0">
          <h3 className={`${compact ? "text-[9px]" : "text-[15px]"} font-semibold text-[color:var(--cs-heading)]`}>
            {getMetricLabel(summary.metric, locale)}
          </h3>
          <p className={`${compact ? "text-[7px]" : "text-[12px]"} text-[color:var(--cs-text-soft)]`}>
            {formatTrend(summary, locale)}
          </p>
        </div>
      </div>

      <div className={`${compact ? "mb-1" : "mb-3"} flex shrink-0 items-end gap-1`}>
        <p className={`${compact ? "text-[0.95rem]" : "text-[1.7rem]"} font-semibold leading-none text-[color:var(--cs-heading)]`}>
          {summary.displayValue ?? summary.currentValue}
        </p>
        <span className={`${compact ? "pb-0 text-[8px]" : "pb-0.5 text-[12px]"} text-[color:var(--cs-text-soft)]`}>
          {summary.unit}
        </span>
      </div>

      <div className={compact ? "min-h-0 flex-1" : "min-h-0 shrink-0"}>
        <VitalChart
          data={vitals}
          metric={summary.metric}
          height={compact ? undefined : chartHeight}
          fill={compact}
          baseline={summary.average15Min}
        />
      </div>
    </article>
  );
}
