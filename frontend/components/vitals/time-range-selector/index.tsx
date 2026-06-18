"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { TimeRange } from "@/types";

type TimeRangeSelectorProps = {
  value?: TimeRange;
  onChange?: (value: TimeRange) => void;
};

const ranges: Record<"vi" | "en", Array<{ value: TimeRange; label: string }>> = {
  vi: [
    { value: "15m", label: "15 ph" },
    { value: "1h", label: "1 giờ" },
    { value: "3h", label: "3 giờ" },
    { value: "9h", label: "9 giờ" },
    { value: "1d", label: "1 ngày" },
    { value: "7d", label: "7 ngày" },
  ],
  en: [
    { value: "15m", label: "15 min" },
    { value: "1h", label: "1 hour" },
    { value: "3h", label: "3 hours" },
    { value: "9h", label: "9 hours" },
    { value: "1d", label: "1 day" },
    { value: "7d", label: "7 days" },
  ],
};

export function TimeRangeSelector({
  value = "15m",
  onChange = () => undefined,
}: TimeRangeSelectorProps) {
  const { locale } = useLocale();

  return (
    <div
      className="inline-flex max-w-full flex-wrap rounded-full border border-[color:rgba(13,71,161,0.12)] bg-white/70 p-0.5"
      aria-label={locale === "vi" ? "Khoảng thời gian" : "Time range"}
    >
      {ranges[locale].map((range) => (
        <button
          key={range.value}
          type="button"
          onClick={() => onChange(range.value)}
          aria-pressed={value === range.value}
          className={[
            "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
            value === range.value
              ? "bg-[linear-gradient(135deg,rgba(13,71,161,0.96),rgba(0,150,136,0.76))] text-white"
              : "text-[color:var(--cs-text-soft)] hover:bg-white",
          ].join(" ")}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
