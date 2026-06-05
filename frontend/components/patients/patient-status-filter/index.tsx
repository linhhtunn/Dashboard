"use client";

import type { PatientStatus } from "@/types";

import { useLocale } from "@/components/providers/LocaleProvider";
import { getPatientStatusLabel } from "@/lib/i18n";

export type PatientStatusFilterValue = "all" | PatientStatus;

type PatientStatusFilterProps = {
  value: PatientStatusFilterValue;
  onChange: (value: PatientStatusFilterValue) => void;
};

const filterClasses: Record<PatientStatusFilterValue, string> = {
  all: "border-[color:rgba(13,71,161,0.12)] bg-white/72 text-[color:var(--cs-heading)]",
  healthy:
    "border-[color:rgba(0,150,136,0.18)] bg-[color:rgba(0,150,136,0.08)] text-[color:var(--cs-teal)]",
  at_risk:
    "border-[color:rgba(245,179,0,0.22)] bg-[color:rgba(245,179,0,0.12)] text-[color:#9a6700]",
  critical:
    "border-[color:rgba(229,72,77,0.22)] bg-[color:rgba(229,72,77,0.12)] text-[color:var(--cs-danger)]",
  recent_symptom:
    "border-[color:rgba(13,71,161,0.18)] bg-[color:rgba(13,71,161,0.1)] text-[color:var(--cs-primary)]",
};

export function PatientStatusFilter({
  value,
  onChange,
}: PatientStatusFilterProps) {
  const { locale } = useLocale();
  const filters: Array<{
    value: PatientStatusFilterValue;
    label: string;
  }> = [
    { value: "all", label: locale === "vi" ? "Tất cả" : "All" },
    {
      value: "critical",
      label: getPatientStatusLabel("critical", locale),
    },
    {
      value: "at_risk",
      label: getPatientStatusLabel("at_risk", locale),
    },
    {
      value: "recent_symptom",
      label: getPatientStatusLabel("recent_symptom", locale),
    },
    {
      value: "healthy",
      label: getPatientStatusLabel("healthy", locale),
    },
  ];

  return (
    <div
      className="flex flex-wrap gap-2"
      aria-label={locale === "vi" ? "Lọc theo trạng thái" : "Filter by status"}
    >
      {filters.map((filter) => {
        const isActive = value === filter.value;

        return (
          <button
            key={filter.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(isActive ? "all" : filter.value)}
            className={[
              "inline-flex items-center rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition",
              filterClasses[filter.value],
              isActive
                ? "shadow-[0_10px_22px_rgba(13,71,161,0.08)] ring-1 ring-white/60"
                : "hover:brightness-[0.98]",
            ].join(" ")}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
