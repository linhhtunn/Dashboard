"use client";

import { Activity } from "lucide-react";
import { useSyncExternalStore } from "react";
import type { DotItemDotProps } from "recharts";
import {
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { MetricSummary, VitalSignalSample } from "@/types";

type BloodPressureCardProps = {
  systolicSummary: MetricSummary;
  diastolicSummary: MetricSummary;
  vitals?: VitalSignalSample[];
  className?: string;
  chartHeight?: number;
  compact?: boolean;
};

type BloodPressurePoint = {
  time: string;
  systolic: number;
  diastolic: number;
  systolicAbnormal: boolean;
  diastolicAbnormal: boolean;
};

const SYSTOLIC_HIGH = 140;
const SYSTOLIC_LOW = 90;
const DIASTOLIC_HIGH = 90;
const DIASTOLIC_LOW = 60;
const SYSTOLIC_COLOR = "#0D47A1";
const DIASTOLIC_COLOR = "#009688";
const ALERT_COLOR = "#E5484D";
const subscribeToMount = () => () => undefined;

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function isSystolicAbnormal(value: number) {
  return value > SYSTOLIC_HIGH || value < SYSTOLIC_LOW;
}

function isDiastolicAbnormal(value: number) {
  return value > DIASTOLIC_HIGH || value < DIASTOLIC_LOW;
}

function AbnormalDot({
  cx,
  cy,
  payload,
  dataKey,
}: DotItemDotProps) {
  if (typeof cx !== "number" || typeof cy !== "number") return null;

  const point = payload as BloodPressurePoint;
  const isAbnormal =
    dataKey === "systolic"
      ? point.systolicAbnormal
      : point.diastolicAbnormal;

  if (!isAbnormal) return null;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={3.5}
      fill={ALERT_COLOR}
      stroke="white"
      strokeWidth={1.5}
    />
  );
}

function BloodPressureChart({
  data,
  height,
  locale,
}: {
  data: BloodPressurePoint[];
  height: number;
  locale: "vi" | "en";
}) {
  const isMounted = useSyncExternalStore(
    subscribeToMount,
    () => true,
    () => false,
  );
  const values = data.flatMap((item) => [item.systolic, item.diastolic]);
  const dataMin = values.length ? Math.min(...values) : 60;
  const dataMax = values.length ? Math.max(...values) : 140;
  const yMin = Math.max(30, Math.floor(Math.min(dataMin - 12, 50)));
  const yMax = Math.ceil(Math.max(dataMax + 12, 160));

  return (
    <div
      className="min-w-0 w-full overflow-hidden rounded-[var(--radius-lg)] border border-white/70 bg-white/60 backdrop-blur-sm"
      style={{ height }}
    >
      {!isMounted ? (
        <div className="h-full w-full" />
      ) : data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-[12px] text-slate-400">
          Chưa có dữ liệu
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 18, right: 18, bottom: 4, left: 30 }}
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
              width={26}
              tickCount={5}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(255,255,255,0.94)",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 12,
                color: "#172554",
                boxShadow: "0 4px 12px rgba(13,71,161,0.08)",
                padding: "6px 10px",
              }}
              cursor={{ stroke: "#94a3b8", strokeOpacity: 0.25 }}
              formatter={(value, name) => [
                `${value ?? "-"} mmHg`,
                name === "systolic"
                  ? locale === "vi" ? "Tâm thu" : "Systolic (SYS)"
                  : locale === "vi" ? "Tâm trương" : "Diastolic (DIA)",
              ]}
            />
            <ReferenceArea
              y1={SYSTOLIC_HIGH}
              y2={yMax}
              fill={ALERT_COLOR}
              fillOpacity={0.055}
              strokeOpacity={0}
            />
            <ReferenceArea
              y1={yMin}
              y2={DIASTOLIC_LOW}
              fill={ALERT_COLOR}
              fillOpacity={0.04}
              strokeOpacity={0}
            />
            <ReferenceLine
              y={SYSTOLIC_HIGH}
              stroke={SYSTOLIC_COLOR}
              strokeDasharray="5 4"
              strokeOpacity={0.42}
              label={{
                value: locale === "vi" ? "Thu 140" : "SYS 140",
                fill: SYSTOLIC_COLOR,
                fontSize: 9,
                position: "insideTopRight",
              }}
            />
            <ReferenceLine
              y={DIASTOLIC_HIGH}
              stroke={DIASTOLIC_COLOR}
              strokeDasharray="5 4"
              strokeOpacity={0.42}
              label={{
                value: locale === "vi" ? "Trương 90" : "DIA 90",
                fill: DIASTOLIC_COLOR,
                fontSize: 9,
                position: "insideTopRight",
              }}
            />
            <Line
              type="monotone"
              dataKey="systolic"
              name="systolic"
              stroke={SYSTOLIC_COLOR}
              strokeWidth={2.2}
              dot={AbnormalDot}
              activeDot={{
                r: 4,
                fill: SYSTOLIC_COLOR,
                stroke: "white",
                strokeWidth: 2,
              }}
            />
            <Line
              type="monotone"
              dataKey="diastolic"
              name="diastolic"
              stroke={DIASTOLIC_COLOR}
              strokeWidth={2.2}
              dot={AbnormalDot}
              activeDot={{
                r: 4,
                fill: DIASTOLIC_COLOR,
                stroke: "white",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function BloodPressureCard({
  systolicSummary,
  diastolicSummary,
  vitals = [],
  className = "",
  chartHeight = 190,
  compact = false,
}: BloodPressureCardProps) {
  const { locale } = useLocale();
  const chartData: BloodPressurePoint[] = [...vitals]
    .sort(
      (left, right) =>
        new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
    )
    .flatMap((sample) => {
      const systolic = sample.vitals.systolicBp;
      const diastolic = sample.vitals.diastolicBp;
      if (systolic === undefined || diastolic === undefined) return [];

      return [{
        time: formatTimestamp(sample.timestamp),
        systolic,
        diastolic,
        systolicAbnormal: isSystolicAbnormal(systolic),
        diastolicAbnormal: isDiastolicAbnormal(diastolic),
      }];
    });
  const abnormalPoints = chartData.filter(
    (point) => point.systolicAbnormal || point.diastolicAbnormal,
  );
  const latest = chartData.at(-1);
  const highestSystolic = Math.max(
    ...chartData.map((point) => point.systolic),
    systolicSummary.currentValue,
  );
  const highestDiastolic = Math.max(
    ...chartData.map((point) => point.diastolic),
    diastolicSummary.currentValue,
  );
  const hasAbnormalValue = abnormalPoints.length > 0;

  return (
    <article
      className={[
        "dashboard-surface flex h-full min-h-0 flex-col rounded-[1.15rem]",
        compact ? "px-2 py-1.5" : "px-3.5 py-3.5",
        hasAbnormalValue
          ? "border-[color:rgba(229,72,77,0.2)] bg-[linear-gradient(180deg,rgba(229,72,77,0.055),rgba(255,255,255,0.88))]"
          : "",
        className,
      ].join(" ")}
    >
      <div className={`flex shrink-0 flex-col ${compact ? "gap-1" : "gap-3"} sm:flex-row sm:items-start sm:justify-between`}>
        <div className="flex min-w-0 items-center gap-2">
          <Activity
            className={compact ? "h-3.5 w-3.5 shrink-0 text-[color:var(--cs-primary)]" : "h-4.5 w-4.5 shrink-0 text-[color:var(--cs-primary)]"}
          />
          <div className="min-w-0">
            <h3 className={`${compact ? "text-[9px]" : "text-[15px]"} font-semibold text-[color:var(--cs-heading)]`}>
              {locale === "vi" ? "Huyết áp" : "Blood pressure"}
            </h3>
            {!compact ? (
              <p className="text-[12px] text-[color:var(--cs-text-soft)]">
                {locale === "vi"
                  ? "Tâm thu và tâm trương trên cùng thang đo"
                  : "Systolic and diastolic on one scale"}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-end gap-1 sm:text-right">
          <p className={`${compact ? "text-[0.95rem]" : "text-[1.7rem]"} font-semibold leading-none text-[color:var(--cs-heading)]`}>
            {latest?.systolic ?? systolicSummary.currentValue}/
            {latest?.diastolic ?? diastolicSummary.currentValue}
          </p>
          <span className={`${compact ? "pb-0 text-[8px]" : "pb-0.5 text-[12px]"} text-[color:var(--cs-text-soft)]`}>
            mmHg
          </span>
        </div>
      </div>

      <div className={`${compact ? "mt-1" : "mt-3"} flex shrink-0 flex-wrap items-center gap-x-3 gap-y-0.5 ${compact ? "text-[7px]" : "text-[10px]"} font-semibold`}>
        <span className="inline-flex items-center gap-1 text-[color:var(--cs-primary)]">
          <span className="h-0.5 w-4 rounded-full bg-[color:var(--cs-primary)]" />
          {locale === "vi" ? "Tâm thu" : "SYS"}
        </span>
        <span className="inline-flex items-center gap-1 text-[color:var(--cs-teal)]">
          <span className="h-0.5 w-4 rounded-full bg-[color:var(--cs-teal)]" />
          {locale === "vi" ? "Tâm trương" : "DIA"}
        </span>
        {!compact ? (
          <span className="text-[color:var(--cs-text-soft)]">
            {locale === "vi" ? "Ngưỡng theo dõi: 140/90" : "Watch threshold: 140/90"}
          </span>
        ) : null}
      </div>

      {hasAbnormalValue && !compact ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[0.75rem] border border-[color:rgba(229,72,77,0.2)] bg-[color:rgba(229,72,77,0.075)] px-3 py-2">
          <p className="text-[11px] font-semibold text-[color:var(--cs-danger)]">
            {locale === "vi"
              ? `${abnormalPoints.length}/${chartData.length} mốc đo có chỉ số bất thường`
              : `${abnormalPoints.length}/${chartData.length} readings contain an abnormal value`}
          </p>
          <span className="text-[10px] text-[color:var(--cs-danger)]">
            {locale === "vi" ? "Cao nhất" : "Peak"} {highestSystolic}/{highestDiastolic} mmHg
          </span>
        </div>
      ) : null}

      <div className={`${compact ? "mt-1" : "mt-3"} min-h-0 shrink-0`}>
        <BloodPressureChart data={chartData} height={chartHeight} locale={locale} />
      </div>
    </article>
  );
}
