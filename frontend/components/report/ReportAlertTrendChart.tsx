"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ReportAlertTrendResponse } from "@/lib/report/types";

type ReportAlertTrendChartProps = {
  data: ReportAlertTrendResponse | null;
  loading?: boolean;
  locale: "vi" | "en";
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
};

export function ReportAlertTrendChart({
  data,
  loading = false,
  locale,
  selectedDate,
  onSelectDate,
}: ReportAlertTrendChartProps) {
  if (loading || !data) {
    return <ChartSkeleton title={locale === "vi" ? "Xu hướng cảnh báo" : "Alert trend"} />;
  }

  const points = data.dates.map((date, index) => ({
    date,
    label: formatDayLabel(date, locale),
    critical: data.critical[index] ?? 0,
    warning: data.warning[index] ?? 0,
  }));

  const empty = points.every(
    (point) => point.critical === 0 && point.warning === 0,
  );

  return (
    <section className="dashboard-surface flex h-full min-h-[280px] flex-col rounded-[1rem] p-4">
      <header className="mb-3">
        <h2 className="text-[14px] font-semibold text-[color:var(--cs-heading)]">
          {locale === "vi" ? "Xu hướng cảnh báo" : "Alert trend"}
        </h2>
        <p className="text-[11px] text-[color:var(--cs-text-soft)]">
          {locale === "vi"
            ? "Nhấn vào một ngày để lọc bảng rủi ro bên dưới"
            : "Click a day to filter the risk table below"}
        </p>
      </header>

      {empty ? (
        <EmptyChart
          message={
            locale === "vi"
              ? "Không có cảnh báo nào trong khoảng thời gian này — khoa đang ổn định"
              : "No alerts in this period — ward is stable"
          }
        />
      ) : (
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={points}
              onClick={(state) => {
                const index = (
                  state as { activeTooltipIndex?: number } | undefined
                )?.activeTooltipIndex;
                if (typeof index === "number" && points[index]) {
                  onSelectDate?.(points[index].date);
                }
              }}
            >
              <CartesianGrid stroke="rgba(13,71,161,0.08)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--cs-text-soft)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--cs-text-soft)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid rgba(13,71,161,0.12)",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="critical"
                name={locale === "vi" ? "Critical" : "Critical"}
                stroke="#E5484D"
                strokeWidth={2.5}
                dot={{
                  r: selectedDate ? 3 : 4,
                  strokeWidth: 2,
                  fill: "#E5484D",
                }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="warning"
                name={locale === "vi" ? "Warning" : "Warning"}
                stroke="#F5B300"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 2, fill: "#F5B300" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function formatDayLabel(date: string, locale: "vi" | "en") {
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
    weekday: "short",
    day: "numeric",
  });
}

function ChartSkeleton({ title }: { title: string }) {
  return (
    <section className="dashboard-surface h-full min-h-[280px] rounded-[1rem] p-4">
      <h2 className="text-[14px] font-semibold text-[color:var(--cs-heading)]">
        {title}
      </h2>
      <div className="mt-6 h-[220px] animate-pulse rounded-[0.8rem] bg-white/55" />
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-[0.8rem] bg-white/45 px-4 py-8 text-center text-[12px] leading-5 text-[color:var(--cs-text-soft)]">
      {message}
    </div>
  );
}
