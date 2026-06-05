import type { MetricSummary, VitalSign } from "@/types";
import { VitalChart } from "../vital-chart";

type MetricCardProps = {
  summary: MetricSummary;
  vitals?: VitalSign[];
  className?: string;
};

type IconProps = {
  className?: string;
  style?: React.CSSProperties;
};

const metricLabels: Record<MetricSummary["metric"], string> = {
  heart_rate: "Heart rate",
  respiratory_rate: "Respiratory rate",
  blood_pressure: "Blood pressure",
  spo2: "SpO2",
  glucose: "Glucose",
  motion: "Motion",
};

const metricColors: Partial<Record<MetricSummary["metric"], string>> = {
  heart_rate: "#3B82F6",
  blood_pressure: "#F59E0B",
  respiratory_rate: "#10B981",
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

function BoltIcon({ className = "", style }: IconProps) {
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
      <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" />
    </svg>
  );
}

function SlidersIcon({ className = "", style }: IconProps) {
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
      <path d="M4 6h10" />
      <path d="M18 6h2" />
      <path d="M4 12h2" />
      <path d="M10 12h10" />
      <path d="M4 18h10" />
      <path d="M18 18h2" />
      <path d="M14 4v4" />
      <path d="M8 10v4" />
      <path d="M16 16v4" />
    </svg>
  );
}

const metricIcons: Record<
  MetricSummary["metric"],
  (props: IconProps) => React.ReactNode
> = {
  heart_rate: HeartIcon,
  respiratory_rate: BoltIcon,
  blood_pressure: SlidersIcon,
  spo2: BoltIcon,
  glucose: SlidersIcon,
  motion: SlidersIcon,
};

function getMetricColor(metric: MetricSummary["metric"]) {
  return metricColors[metric] ?? "var(--color-primary)";
}

function formatTrend(summary: MetricSummary) {
  if (summary.changePct === undefined || summary.trend === "stable") {
    return "Stable vs 15 min ago";
  }

  const direction = summary.trend === "down" ? "\u2193" : "\u2191";
  return `${direction} ${Math.abs(summary.changePct)}% vs 15 min ago`;
}

export function MetricCard({
  summary,
  vitals = [],
  className = "",
}: MetricCardProps) {
  const Icon = metricIcons[summary.metric];
  const metricColor = getMetricColor(summary.metric);

  return (
    <article className={["bg-transparent", className].join(" ")}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-text-strong">Index</p>
        <p className="whitespace-nowrap text-sm font-medium text-secondary">
          {"\u2713"} Stable in last 15 min
        </p>
      </div>

      <div className="mb-4 flex min-w-0 items-center gap-3 whitespace-nowrap">
        <Icon className="h-5 w-5 shrink-0" style={{ color: metricColor }} />
        <h3 className="text-lg font-semibold leading-6 text-text-strong">
          {metricLabels[summary.metric]}
        </h3>
        <p className="min-w-0 truncate text-sm font-medium text-text-body sm:text-base">
          {formatTrend(summary)}
        </p>
      </div>

      <VitalChart data={vitals} metric={summary.metric} height={228} />
    </article>
  );
}
