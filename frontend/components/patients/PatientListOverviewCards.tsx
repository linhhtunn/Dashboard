"use client";

import { AlertTriangle, HeartPulse, UsersRound, UserCheck } from "lucide-react";
import { useMemo } from "react";

import type { PatientListItem } from "@/components/patients/patient-card";
import { useLocale } from "@/components/providers/LocaleProvider";

type PatientListOverviewCardsProps = {
  items: PatientListItem[];
  loading: boolean;
};

export function PatientListOverviewCards({
  items,
  loading,
}: PatientListOverviewCardsProps) {
  const { locale } = useLocale();

  const stats = useMemo(() => {
    const critical = items.filter((item) => item.patient.status === "critical").length;
    const attention = items.filter(
      (item) =>
        item.patient.status === "critical" ||
        item.patient.status === "at_risk" ||
        item.patient.status === "recent_symptom" ||
        item.openAlertCount > 0,
    ).length;
    const stable = items.filter((item) => item.patient.status === "healthy").length;
    const openAlerts = items.reduce((sum, item) => sum + item.openAlertCount, 0);
    return {
      total: items.length,
      critical,
      attention,
      stable,
      openAlerts,
    };
  }, [items]);

  const labels =
    locale === "vi"
      ? {
          total: "Tổng bệnh nhân",
          critical: "Nguy kịch",
          attention: "Cần ưu tiên",
          openAlerts: "Cảnh báo mở",
          stable: "Ổn định",
        }
      : {
          total: "Total patients",
          critical: "Critical",
          attention: "Needs priority",
          openAlerts: "Open alerts",
          stable: "Stable",
        };

  if (loading) {
    return (
      <div className="mb-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={`patient-overview-skeleton-${index}`}
            className="dashboard-surface h-[78px] animate-pulse rounded-[0.95rem]"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      icon: UsersRound,
      label: labels.total,
      value: stats.total,
      accent: "text-[color:var(--cs-primary)]",
      bg: "bg-[color:rgba(13,71,161,0.1)]",
    },
    {
      icon: AlertTriangle,
      label: labels.critical,
      value: stats.critical,
      accent: "text-[color:var(--cs-danger)]",
      bg: "bg-[color:rgba(229,72,77,0.1)]",
    },
    {
      icon: HeartPulse,
      label: labels.attention,
      value: stats.attention,
      accent: "text-[color:#8a6100]",
      bg: "bg-[color:rgba(245,179,0,0.12)]",
    },
    {
      icon: AlertTriangle,
      label: labels.openAlerts,
      value: stats.openAlerts,
      accent: "text-[color:var(--cs-teal)]",
      bg: "bg-[color:rgba(0,150,136,0.1)]",
    },
    {
      icon: UserCheck,
      label: labels.stable,
      value: stats.stable,
      accent: "text-[color:var(--cs-heading)]",
      bg: "bg-[color:rgba(15,23,42,0.06)]",
    },
  ];

  return (
    <div className="mb-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(({ icon: Icon, label, value, accent, bg }) => (
        <article
          key={label}
          className="dashboard-surface flex items-center gap-3 rounded-[0.95rem] px-3 py-2.5"
        >
          <span
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.7rem]",
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
            <p className="text-[1.35rem] font-semibold leading-none text-[color:var(--cs-heading)]">
              {value}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
