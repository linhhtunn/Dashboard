"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import type { ReportSummaryResponse } from "@/lib/report/types";

type ReportSummaryCardsProps = {
  summary: ReportSummaryResponse | null;
  loading?: boolean;
  locale: "vi" | "en";
};

export function ReportSummaryCards({
  summary,
  loading = false,
  locale,
}: ReportSummaryCardsProps) {
  if (loading || !summary) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`summary-skeleton-${index}`}
            className="dashboard-surface h-[118px] animate-pulse rounded-[1rem] bg-white/50"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label:
        locale === "vi" ? "Bệnh nhân theo dõi" : "Patients monitored",
      value: String(summary.total_patients),
      trend: summary.trends.patients_delta,
      trendGoodWhenUp: true,
      suffix:
        locale === "vi" ? "so với kỳ trước" : "vs previous period",
      extra: null,
    },
    {
      label:
        locale === "vi" ? "Cảnh báo phát sinh" : "Alerts generated",
      value: String(summary.total_alerts),
      trend: summary.trends.alerts_delta,
      trendGoodWhenUp: false,
      suffix:
        locale === "vi" ? "so với kỳ trước" : "vs previous period",
      extra: (
        <p className="mt-1 text-[10px] text-[color:var(--cs-text-soft)]">
          <span className="text-[color:var(--cs-danger)]">
            {summary.critical_count} Critical
          </span>
          {" · "}
          <span className="text-[color:#B8860B]">
            {summary.warning_count} Warning
          </span>
        </p>
      ),
    },
    {
      label: locale === "vi" ? "Tỷ lệ xử lý" : "Resolution rate",
      value: `${summary.resolve_rate}%`,
      trend: summary.trends.resolve_rate_delta,
      trendGoodWhenUp: true,
      suffix: locale === "vi" ? "so với kỳ trước" : "vs previous period",
      valueClass:
        summary.resolve_rate >= 80
          ? "text-[color:var(--cs-teal)]"
          : summary.resolve_rate >= 60
            ? "text-[color:#B8860B]"
            : "text-[color:var(--cs-danger)]",
      extra: null,
    },
    {
      label:
        locale === "vi" ? "Phản hồi alert TB" : "Avg alert response",
      value: `${summary.avg_response_minutes} ${
        locale === "vi" ? "phút" : "min"
      }`,
      trend: summary.trends.response_delta,
      trendGoodWhenUp: false,
      suffix: locale === "vi" ? "so với kỳ trước" : "vs previous period",
      extra: null,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="dashboard-surface rounded-[1rem] px-4 py-3.5"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--cs-text-soft)]">
            {card.label}
          </p>
          <p
            className={[
              "mt-2 text-[1.65rem] font-semibold leading-none text-[color:var(--cs-heading)]",
              card.valueClass ?? "",
            ].join(" ")}
          >
            {card.value}
          </p>
          <TrendLine
            delta={card.trend}
            goodWhenUp={card.trendGoodWhenUp}
            suffix={card.suffix}
            locale={locale}
          />
          {card.extra}
        </article>
      ))}
    </div>
  );
}

function TrendLine({
  delta,
  goodWhenUp,
  suffix,
  locale,
}: {
  delta: number;
  goodWhenUp: boolean;
  suffix: string;
  locale: "vi" | "en";
}) {
  const improved =
    delta === 0 ? null : goodWhenUp ? delta > 0 : delta < 0;
  const color =
    improved === null
      ? "text-[color:var(--cs-text-soft)]"
      : improved
        ? "text-[color:var(--cs-teal)]"
        : "text-[color:var(--cs-danger)]";

  const Icon =
    delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const prefix = delta > 0 ? "+" : "";

  return (
    <p className={`mt-2 flex items-center gap-1 text-[11px] ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>
        {prefix}
        {delta}
        {locale === "vi" && suffix.includes("phút") && delta !== 0
          ? " phút"
          : ""}
        {locale === "en" && suffix.includes("min") && delta !== 0
          ? " min"
          : delta !== 0 && suffix.includes("%")
            ? "%"
            : ""}{" "}
        {suffix}
      </span>
    </p>
  );
}
