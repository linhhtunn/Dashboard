"use client";

import { AlertTriangle, BarChart3, Loader2, Table2 } from "lucide-react";

import { PanelCard } from "@/components/common/PanelCard";
import { MarkdownLite } from "@/components/common/MarkdownLite";
import { useLocale } from "@/components/providers/LocaleProvider";
import { formatShortClockTime, getMetricLabel } from "@/lib/i18n";
import type { AgentInsightPayload } from "@/lib/ai/types";
import type { VitalMetric } from "@/types";

type AgentInsightCardProps = {
  title: string;
  loading?: boolean;
  error?: string | null;
  payload: AgentInsightPayload | null;
  emptyCopy: {
    vi: string;
    en: string;
  };
};

export function AgentInsightCard({
  title,
  loading = false,
  error,
  payload,
  emptyCopy,
}: AgentInsightCardProps) {
  const { locale } = useLocale();

  return (
    <PanelCard className="px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[color:var(--cs-teal)]">{title}</p>
          {payload ? (
            <p className="mt-1 text-xs text-[color:var(--cs-text-soft)]">
              {locale === "vi" ? "Cập nhật lúc" : "Updated at"}{" "}
              {formatShortClockTime(payload.generatedAt, locale)}
            </p>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-3 rounded-[1rem] bg-white/65 px-4 py-4 text-sm text-[color:var(--cs-text-soft)]">
          <Loader2 className="h-4 w-4 animate-spin text-[color:var(--cs-primary)]" />
          <span>
            {locale === "vi"
              ? "Đang lấy nội dung phân tích từ hệ thống AI..."
              : "Fetching analysis from the AI backend..."}
          </span>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="mt-4 flex items-start gap-3 rounded-[1rem] border border-[color:rgba(229,72,77,0.18)] bg-[color:rgba(229,72,77,0.08)] px-4 py-4 text-sm text-[color:var(--cs-danger)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {!loading && !error && !payload ? (
        <div className="mt-4 rounded-[1rem] bg-white/65 px-4 py-4 text-sm text-[color:var(--cs-text-soft)]">
          {emptyCopy[locale]}
        </div>
      ) : null}

      {!loading && !error && payload ? (
        <div className="mt-4 space-y-4">
          <MarkdownLite
            className="text-[0.98rem] leading-7 text-[color:var(--cs-text)]"
            content={payload.summary.answer}
          />

          {payload.summary.keyFindings.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--cs-text-soft)]">
                {locale === "vi" ? "Điểm chính" : "Key findings"}
              </p>
              <div className="space-y-2">
                {payload.summary.keyFindings.map((finding) => (
                  <div
                    key={finding}
                    className="rounded-[1rem] bg-white/72 px-3.5 py-3 text-sm text-[color:var(--cs-text)]"
                  >
                    {finding}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {payload.visualization.hasChart && payload.visualization.dataPoints.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--cs-heading)]">
                <BarChart3 className="h-4 w-4 text-[color:var(--cs-primary)]" />
                <span>
                  {payload.visualization.chartTitle ||
                    (locale === "vi" ? "Chỉ số liên quan" : "Related metrics")}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {payload.visualization.dataPoints.slice(0, 4).map((point) => (
                  <div
                    key={`${point.metric}-${point.timestamp}`}
                    className="rounded-[1rem] bg-white/72 px-3.5 py-3"
                  >
                    <p className="text-sm font-medium text-[color:var(--cs-heading)]">
                      {getMetricLabel(normalizeMetric(point.metric), locale)}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[color:var(--cs-primary)]">
                      {point.value}
                      <span className="ml-1 text-sm font-medium text-[color:var(--cs-text-soft)]">
                        {point.unit}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--cs-text-soft)]">
                      {formatShortClockTime(point.timestamp, locale)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {payload.comparison.hasComparison && payload.comparison.rows.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--cs-heading)]">
                <Table2 className="h-4 w-4 text-[color:var(--cs-primary)]" />
                <span>
                  {locale === "vi" ? "Bảng so sánh" : "Comparison table"}
                </span>
              </div>

              <div className="overflow-hidden rounded-[1rem] border border-[color:var(--cs-border)] bg-white/72">
                {payload.comparison.headers.length > 0 ? (
                  <div
                    className="grid gap-3 border-b border-[color:var(--cs-border)] px-3.5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--cs-text-soft)]"
                    style={{
                      gridTemplateColumns: `repeat(${payload.comparison.headers.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {payload.comparison.headers.map((header) => (
                      <span key={header}>{header}</span>
                    ))}
                  </div>
                ) : null}

                <div className="divide-y divide-[color:var(--cs-border)]">
                  {payload.comparison.rows.map((row, index) => (
                    <div
                      key={`${row.join("-")}-${index}`}
                      className="grid gap-3 px-3.5 py-3 text-sm text-[color:var(--cs-text)]"
                      style={{
                        gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {row.map((cell) => (
                        <span key={cell}>{cell}</span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </PanelCard>
  );
}

function normalizeMetric(metric: string): VitalMetric {
  switch (metric.toLowerCase()) {
    case "hr":
    case "heart_rate":
      return "heart_rate";
    case "hrv":
    case "rmssd":
    case "hrv_rmssd":
    case "respiratory_rate":
    case "respiratoryrate":
    case "rr":
      return "respiratory_rate";
    case "spo2":
    case "spo₂":
      return "spo2";
    case "sbp":
    case "systolic_bp":
      return "systolic_bp";
    case "dbp":
    case "diastolic_bp":
      return "diastolic_bp";
    default:
      return "heart_rate";
  }
}
