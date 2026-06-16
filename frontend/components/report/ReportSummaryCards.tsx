"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { localizeText } from "@/lib/i18n";
import type { ReportSummaryResponse } from "@/lib/report/types";

type ReportSummaryCardsProps = {
  summary: ReportSummaryResponse | null;
  loading: boolean;
  labels: {
    patients: string;
    alerts: string;
    resolveRate: string;
    responseTime: string;
    vsPrevious: string;
    critical: string;
    warning: string;
    minutes: string;
  };
};

export function ReportSummaryCards({
  summary,
  loading,
  labels,
}: ReportSummaryCardsProps) {
  const { locale } = useLocale();

  if (loading || !summary) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`summary-skeleton-${index}`}
            className="dashboard-surface h-[118px] animate-pulse rounded-[1rem]"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: labels.patients,
      value: String(summary.total_patients),
      trend: summary.trends.patients_delta,
      trendGoodWhenUp: true,
      footer: null,
    },
    {
      title: labels.alerts,
      value: String(summary.total_alerts),
      trend: summary.trends.alerts_delta,
      trendGoodWhenUp: false,
      footer: (
        <span className="text-[10px] text-[color:var(--cs-text-soft)]">
          <span className="text-[color:var(--cs-danger)]">
            {summary.critical_count} {labels.critical}
          </span>
          {" · "}
          <span className="text-[#B8860B]">
            {summary.warning_count} {labels.warning}
          </span>
        </span>
      ),
    },
    {
      title: labels.resolveRate,
      value: `${summary.resolve_rate}%`,
      trend: summary.trends.resolve_rate_delta,
      trendGoodWhenUp: true,
      valueClass:
        summary.resolve_rate >= 80
          ? "text-[color:var(--cs-teal)]"
          : summary.resolve_rate >= 60
            ? "text-[#B8860B]"
            : "text-[color:var(--cs-danger)]",
      suffix: "%",
      footer: null,
    },
    {
      title: labels.responseTime,
      value: String(summary.avg_response_minutes),
      trend: summary.trends.response_delta,
      trendGoodWhenUp: false,
      footer: (
        <span className="text-[10px] text-[color:var(--cs-text-soft)]">
          {labels.minutes}
        </span>
      ),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.title}
          className="dashboard-surface rounded-[1rem] px-4 py-3.5"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--cs-text-soft)]">
            {card.title}
          </p>
          <p
            className={[
              "mt-2 text-[1.75rem] font-semibold leading-none text-[color:var(--cs-heading)]",
              card.valueClass ?? "",
            ].join(" ")}
          >
            {card.value}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TrendBadge
              delta={card.trend}
              goodWhenUp={card.trendGoodWhenUp}
              locale={locale}
              vsLabel={labels.vsPrevious}
            />
            {card.footer}
          </div>
        </article>
      ))}
    </div>
  );
}

function TrendBadge({
  delta,
  goodWhenUp,
  locale,
  vsLabel,
}: {
  delta: number;
  goodWhenUp: boolean;
  locale: "vi" | "en";
  vsLabel: string;
}) {
  const isUp = delta > 0;
  const isGood = goodWhenUp ? isUp : !isUp;
  const Icon = isUp ? TrendingUp : TrendingDown;
  const abs = Math.abs(delta);

  if (delta === 0) {
    return (
      <span className="text-[10px] text-[color:var(--cs-text-soft)]">
        {locale === "vi" ? "Không đổi" : "No change"} {vsLabel}
      </span>
    );
  }

  return (
    <span
      className={[
        "inline-flex items-center gap-1 text-[10px] font-medium",
        isGood ? "text-[color:var(--cs-teal)]" : "text-[color:var(--cs-danger)]",
      ].join(" ")}
    >
      <Icon className="h-3 w-3" />
      {isUp ? "+" : "-"}
      {abs} {vsLabel}
    </span>
  );
}

export function formatReportUpdatedAt(iso: string, locale: "vi" | "en") {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function localizeDepartmentLabel(
  summary: ReportSummaryResponse,
  locale: "vi" | "en",
) {
  return localizeText(summary.department_label, locale);
}
