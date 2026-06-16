"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getAlertTypeLabel } from "@/lib/i18n";
import type { ReportAlertByTypeResponse } from "@/lib/report/types";

type ReportAlertByTypeChartProps = {
  data: ReportAlertByTypeResponse | null;
  loading?: boolean;
  locale: "vi" | "en";
};

const severityColors = {
  critical: "#E5484D",
  warning: "#F5B300",
  info: "#94A3B8",
};

export function ReportAlertByTypeChart({
  data,
  loading = false,
  locale,
}: ReportAlertByTypeChartProps) {
  if (loading || !data) {
    return (
      <section className="dashboard-surface h-full min-h-[280px] animate-pulse rounded-[1rem] bg-white/50 p-4" />
    );
  }

  const items = data.items.map((item) => ({
    ...item,
    label: getAlertTypeLabel(item.type, locale),
  }));

  return (
    <section className="dashboard-surface flex h-full min-h-[280px] flex-col rounded-[1rem] p-4">
      <header className="mb-3">
        <h2 className="text-[14px] font-semibold text-[color:var(--cs-heading)]">
          {locale === "vi" ? "Cảnh báo theo loại" : "Alerts by type"}
        </h2>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[12px] text-[color:var(--cs-text-soft)]">
          {locale === "vi"
            ? "Không có cảnh báo nào trong khoảng thời gian này"
            : "No alerts in this period"}
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={items} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid stroke="rgba(13,71,161,0.08)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={108}
                  tick={{ fontSize: 10, fill: "var(--cs-text-soft)" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(13,71,161,0.12)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {items.map((item) => (
                    <Cell
                      key={item.type}
                      fill={severityColors[item.severity] ?? severityColors.warning}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {data.top_insight_type ? (
            <p className="mt-2 text-[11px] text-[color:var(--cs-text-soft)]">
              <span className="font-semibold text-[color:var(--cs-heading)]">
                {getAlertTypeLabel(data.top_insight_type, locale)}
              </span>{" "}
              {locale === "vi"
                ? `chiếm ${data.top_insight_percent}% tổng cảnh báo trong kỳ này`
                : `accounts for ${data.top_insight_percent}% of alerts this period`}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
