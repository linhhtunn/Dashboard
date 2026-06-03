import type { PatientStatus } from "@/types";

export type PatientStatusFilterValue = "all" | PatientStatus;

type PatientStatusFilterProps = {
  value: PatientStatusFilterValue;
  onChange: (value: PatientStatusFilterValue) => void;
};

const filters: Array<{
  value: PatientStatusFilterValue;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "healthy", label: "Healthy" },
  { value: "at_risk", label: "At Risk" },
  { value: "critical", label: "Critical" },
  { value: "recent_symptom", label: "Recent Symptom" },
];

const filterClasses: Record<PatientStatusFilterValue, string> = {
  all: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  healthy: "border-teal-200 bg-teal-50 text-teal-700",
  at_risk: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-red-200 bg-red-50 text-red-600",
  recent_symptom: "border-blue-700 bg-blue-700 text-white",
};

const activeFilterClasses: Record<PatientStatusFilterValue, string> = {
  all: "border-slate-300 bg-slate-100 text-slate-800",
  healthy: "border-teal-300 bg-teal-100 text-teal-800",
  at_risk: "border-amber-300 bg-amber-100 text-amber-900",
  critical: "border-red-300 bg-red-100 text-red-700",
  recent_symptom: "border-blue-700 bg-blue-700 text-white",
};

export function PatientStatusFilter({
  value,
  onChange,
}: PatientStatusFilterProps) {
  return (
    <div className="flex gap-3 overflow-visible" aria-label="Patient status">
      {filters.map((filter) => {
        const isActive = value === filter.value;

        return (
          <button
            key={filter.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(isActive ? "all" : filter.value)}
            className={[
              "box-border inline-flex shrink-0 items-center gap-2 overflow-visible rounded-full border px-5 py-2 text-sm font-medium transition-colors focus:outline-none",
              isActive
                ? activeFilterClasses[filter.value]
                : filterClasses[filter.value],
              !isActive && filter.value !== "all" ? "hover:brightness-95" : "",
            ].join(" ")}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
