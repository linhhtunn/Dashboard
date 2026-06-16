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

import { useLocale } from "@/components/providers/LocaleProvider";
import { getAlertTypeLabel } from "@/lib/i18n";
import { localizeText } from "@/lib/i18n";
import type { ReportAlertByTypeResponse } from "@/lib/report/types";

type ReportAlertByTypeChartProps = {
  data: ReportAlertByTypeResponse | null;
  loading: boolean;
  title: string;
};

const severityColors = {
  critical: "var(--cs-danger)",
  warning: "#F5B300",
  info: "#8ED3E6",
};

export function ReportAlertByTypeChart({
  data,
  loading,
  title,
}: ReportAlertByTypeChartProps) {
  const { locale } = useLocale();

  if (loading || !data) {
    return <div className="dashboard-surface h-[280px] animate-pulse rounded-[1rem]" />;
  }

  const chartData = data.items.map((item) => ({
    type: getAlertTypeLabel(item.type, locale),
    count: item.count,
    severity: item.severity,
  }));

  return (
    <section className="dashboard-surface flex h-full flex-col rounded-[1rem] px-4 py-4">
      <h2 className="text-[13px] font-semibold text-[color:var(--cs-heading)]">
        {title}
      </h2>
      <div className="mt-3 min-h-[200px] flex-1">
        {chartData.length === 0 ? (
          <p className="text-[12px] text-[color:var(--cs-text-soft)]">
            {locale === "vi"
              ? "Không có cảnh báo trong kỳ đã chọn."
              : "No alerts in the selected period."}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
              <CartesianGrid stroke="rgba(13,71,161,0.08)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="type"
                width={108}
                tick={{ fontSize: 10, fill: "var(--cs-text-soft)" }}
              />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.type}
                    fill={
                      severityColors[entry.severity as keyof typeof severityColors] ??
                      severityColors.warning
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-5 text-[color:var(--cs-text-soft)]">
        {localizeText(data.top_insight, locale)}
      </p>
    </section>
  );
}
