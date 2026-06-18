"use client";

import { Stethoscope, UserCog, UsersRound } from "lucide-react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { localizeText } from "@/lib/i18n";
import type { ReportOverviewResponse } from "@/lib/report/types";

type ReportOverviewCardsProps = {
  data: ReportOverviewResponse | null;
  loading: boolean;
  labels: {
    title: string;
    patients: string;
    nurses: string;
    doctors: string;
    coordinators: string;
    staffTotal: string;
    today: string;
  };
};

export function ReportOverviewCards({
  data,
  loading,
  labels,
}: ReportOverviewCardsProps) {
  const { locale } = useLocale();

  if (loading || !data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={`overview-skeleton-${index}`}
            className="dashboard-surface h-[96px] animate-pulse rounded-[1rem]"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      icon: UsersRound,
      label: labels.patients,
      value: data.total_patients,
      accent: "text-[color:var(--cs-primary)]",
      bg: "bg-[color:rgba(13,71,161,0.1)]",
    },
    {
      icon: UserCog,
      label: labels.nurses,
      value: data.nurses_on_duty,
      accent: "text-[color:var(--cs-teal)]",
      bg: "bg-[color:rgba(0,150,136,0.1)]",
    },
    {
      icon: Stethoscope,
      label: labels.doctors,
      value: data.doctors_on_duty,
      accent: "text-[color:var(--cs-primary)]",
      bg: "bg-[color:rgba(13,71,161,0.08)]",
    },
    {
      icon: UserCog,
      label: labels.coordinators,
      value: data.coordinators_on_duty,
      accent: "text-[#0B7A70]",
      bg: "bg-[color:rgba(0,150,136,0.08)]",
    },
    {
      icon: UsersRound,
      label: labels.staffTotal,
      value: data.staff_on_duty_total,
      accent: "text-[color:var(--cs-heading)]",
      bg: "bg-[color:rgba(15,23,42,0.06)]",
    },
  ];

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[color:var(--cs-text-soft)]">
          {labels.title}
        </h2>
        <p className="text-[10px] text-[color:var(--cs-text-soft)]">
          {labels.today}: {formatToday(data.today_date, locale)}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(({ icon: Icon, label, value, accent, bg }) => (
          <article
            key={label}
            className="dashboard-surface flex items-center gap-3 rounded-[1rem] px-3.5 py-3"
          >
            <span
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.8rem]",
                bg,
                accent,
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cs-text-soft)]">
                {label}
              </p>
              <p className="text-[1.5rem] font-semibold leading-none text-[color:var(--cs-heading)]">
                {value}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatToday(dateKey: string, locale: "vi" | "en") {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${dateKey}T12:00:00`));
}

export function localizeOverviewDepartment(
  data: ReportOverviewResponse,
  locale: "vi" | "en",
) {
  return localizeText(data.department_label, locale);
}
