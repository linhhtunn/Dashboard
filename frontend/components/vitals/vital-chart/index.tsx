"use client";

import { useSyncExternalStore } from "react";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { VitalMetric, VitalSignalSample } from "@/types";

type VitalChartProps = {
  data: VitalSignalSample[];
  metric: VitalMetric;
  height?: number;
  className?: string;
};

const metricColors: Record<VitalMetric, string> = {
  heart_rate: "#0D47A1",
  hrv_rmssd: "#009688",
  spo2: "#009688",
  systolic_bp: "#F5B300",
  diastolic_bp: "#FB923C",
};

const metricFloor: Record<VitalMetric, number> = {
  heart_rate: 40,
  hrv_rmssd: 0,
  spo2: 75,
  systolic_bp: 60,
  diastolic_bp: 40,
};

const metricAlertThreshold: Partial<Record<VitalMetric, number>> = {
  heart_rate: 100,
  spo2: 94,
  systolic_bp: 140,
};

const subscribeToMount = () => () => undefined;

function getMetricValue(vital: VitalSignalSample, metric: VitalMetric) {
  switch (metric) {
    case "heart_rate":
      return vital.vitals.heartRate ?? 0;
    case "hrv_rmssd":
      return vital.vitals.hrvRmssd ?? 0;
    case "spo2":
      return vital.vitals.spo2 ?? 0;
    case "systolic_bp":
      return vital.vitals.systolicBp ?? 0;
    case "diastolic_bp":
      return vital.vitals.diastolicBp ?? 0;
  }
}

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(
    date.getUTCMinutes(),
  ).padStart(2, "0")}`;
}

export function VitalChart({
  data,
  metric,
  height = 160,
  className = "",
}: VitalChartProps) {
  const isMounted = useSyncExternalStore(
    subscribeToMount,
    () => true,
    () => false,
  );
  const color = metricColors[metric];
  const floor = metricFloor[metric];
  const threshold = metricAlertThreshold[metric];

  const chartData = data.map((sample) => ({
    time: formatTimestamp(sample.timestamp),
    value: getMetricValue(sample, metric),
  }));

  const values = chartData.map((item) => item.value);
  const dataMin = values.length ? Math.min(...values) : floor;
  const dataMax = values.length ? Math.max(...values) : floor + 60;
  const pad = Math.max((dataMax - dataMin) * 0.2, 4);
  const yMin = Math.floor(Math.min(dataMin - pad, floor));
  const yMax = Math.ceil(dataMax + pad);

  return (
    <div
      className={[
        "w-full overflow-hidden rounded-[var(--radius-lg)] border border-white/70 bg-white/60 backdrop-blur-sm",
        className,
      ].join(" ")}
      style={{ height }}
    >
      {!isMounted ? (
        <div className="h-full w-full" />
      ) : chartData.length === 0 ? (
        <div className="flex h-full items-center justify-center text-[12px] text-slate-400">
          Chưa có dữ liệu
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 14, right: 16, bottom: 4, left: 28 }}
          >
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              width={24}
              tickCount={4}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(255,255,255,0.92)",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 12,
                color: "#172554",
                boxShadow: "0 4px 12px rgba(13,71,161,0.08)",
                padding: "6px 10px",
              }}
              itemStyle={{ color }}
              cursor={{ stroke: color, strokeOpacity: 0.2, strokeWidth: 1 }}
              formatter={(value) => [value ?? "-", metric.replace(/_/g, " ")]}
            />
            {threshold !== undefined ? (
              <ReferenceLine
                y={threshold}
                stroke={color}
                strokeDasharray="4 3"
                strokeOpacity={0.35}
                strokeWidth={1}
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: color, stroke: "white", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
