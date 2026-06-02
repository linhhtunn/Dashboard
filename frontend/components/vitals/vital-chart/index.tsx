import type { VitalMetric, VitalSign } from "@/types";

type VitalChartProps = {
  data: VitalSign[];
  metric: VitalMetric;
  height?: number;
  className?: string;
};

const chartWidth = 320;
const chartHeight = 180;
const paddingX = 34;
const paddingTop = 16;
const paddingBottom = 30;
const yTicks = [0, 40, 80, 120];
const xTicks = ["09:15", "09:30", "09:45"];
const metricColors: Partial<Record<VitalMetric, string>> = {
  heart_rate: "#3B82F6",
  blood_pressure: "#F59E0B",
  respiratory_rate: "#10B981",
};

function getMetricColor(metric: VitalMetric) {
  return metricColors[metric] ?? "var(--color-primary)";
}

function getMetricValue(vital: VitalSign, metric: VitalMetric) {
  switch (metric) {
    case "heart_rate":
      return vital.heartRate;
    case "respiratory_rate":
      return vital.respiratoryRate;
    case "blood_pressure":
      return vital.systolicBp;
    case "spo2":
      return vital.spo2;
    case "glucose":
      return vital.glucoseLevel;
    case "motion":
      return {
        still: 0,
        walking: 1,
        running: 2,
        fall_detected: 3,
      }[vital.motionStatus];
  }
}

function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y}`;
  }

  return points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    const previous = points[index - 1];
    const controlDistance = (point.x - previous.x) / 2;

    return `${path} C ${previous.x + controlDistance} ${previous.y}, ${
      point.x - controlDistance
    } ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

export function VitalChart({
  data,
  metric,
  height = chartHeight,
  className = "",
}: VitalChartProps) {
  const lineColor = getMetricColor(metric);
  const values = data.map((vital) => getMetricValue(vital, metric));
  const maxValue = Math.max(120, ...values);
  const domainMax = maxValue > 120 ? maxValue : 120;
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const plotWidth = chartWidth - paddingX * 2;

  function getY(value: number) {
    const clampedValue = Math.max(0, Math.min(value, domainMax));
    return paddingTop + (1 - clampedValue / domainMax) * plotHeight;
  }

  const points = data.map((vital, index) => {
    const value = getMetricValue(vital, metric);
    const x =
      data.length === 1
        ? chartWidth / 2
        : paddingX + (index / (data.length - 1)) * plotWidth;
    const y = getY(value);

    return {
      x,
      y,
    };
  });

  const path = buildSmoothPath(points);
  const lastPoint = points.at(-1);

  return (
    <div
      className={[
        "w-full overflow-hidden rounded-3xl bg-slate-50 py-2",
        className,
      ].join(" ")}
      style={{ height }}
    >
      <svg
        role="img"
        aria-label={`${metric.replaceAll("_", " ")} trend chart`}
        className="h-full w-full"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="none"
      >
        {points.length > 0 ? (
          <>
            {yTicks.map((tick) => (
              <text
                key={tick}
                x={paddingX - 12}
                y={getY(tick)}
                fill="#94a3b8"
                fontSize="10"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {tick}
              </text>
            ))}

            <path
              d={path}
              fill="none"
              stroke={lineColor}
              strokeLinecap="round"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />

            {lastPoint ? (
              <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r="3"
                fill={lineColor}
                stroke="white"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}

            {xTicks.map((tick, index) => (
              <text
                key={tick}
                x={paddingX + (index / (xTicks.length - 1)) * plotWidth}
                y={chartHeight - 8}
                fill="#94a3b8"
                fontSize="10"
                textAnchor="middle"
              >
                {tick}
              </text>
            ))}
          </>
        ) : (
          <text
            x={chartWidth / 2}
            y={chartHeight / 2}
            fill="var(--color-text-body)"
            fontSize="12"
            textAnchor="middle"
          >
            No vitals
          </text>
        )}
      </svg>
    </div>
  );
}
