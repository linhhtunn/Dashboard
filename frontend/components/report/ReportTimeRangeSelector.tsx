"use client";

import type { ReportRange } from "@/lib/report/types";

type ReportTimeRangeSelectorProps = {
  range: ReportRange;
  onChange: (range: ReportRange) => void;
  locale: "vi" | "en";
};

export function ReportTimeRangeSelector({
  range,
  onChange,
  locale,
}: ReportTimeRangeSelectorProps) {
  const options: { value: ReportRange; label: string }[] =
    locale === "vi"
      ? [
          { value: "7d", label: "7 ngày" },
          { value: "30d", label: "30 ngày" },
        ]
      : [
          { value: "7d", label: "7 days" },
          { value: "30d", label: "30 days" },
        ];

  return (
    <div className="inline-flex rounded-[0.7rem] border border-[color:rgba(13,71,161,0.14)] bg-white/70 p-0.5">
      {options.map((option) => {
        const active = range === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              "rounded-[0.55rem] px-3 py-1.5 text-[12px] font-semibold transition",
              active
                ? "bg-[color:var(--cs-primary)] text-white shadow-[0_8px_18px_rgba(13,71,161,0.18)]"
                : "text-[color:var(--cs-text)] hover:text-[color:var(--cs-primary)]",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
