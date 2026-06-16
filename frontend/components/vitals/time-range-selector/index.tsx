"use client";

import { useLocale } from "@/components/providers/LocaleProvider";

type TimeRangeSelectorProps = {
  value?: string;
  onChange?: (value: string) => void;
};

export function TimeRangeSelector({
  value = "24h",
  onChange = () => undefined,
}: TimeRangeSelectorProps) {
  const { locale } = useLocale();
  const ranges =
    locale === "vi"
      ? [
          { value: "6h", label: "6 giờ" },
          { value: "24h", label: "24 giờ" },
          { value: "7d", label: "7 ngày" },
        ]
      : [
          { value: "6h", label: "6 hours" },
          { value: "24h", label: "24 hours" },
          { value: "7d", label: "7 days" },
        ];

  return (
    <div
      className="inline-flex rounded-full border border-[color:rgba(13,71,161,0.12)] bg-white/70 p-0.5"
      aria-label={locale === "vi" ? "Khoảng thời gian" : "Time range"}
    >
      {ranges.map((range) => (
        <button
          key={range.value}
          type="button"
          onClick={() => onChange(range.value)}
          aria-pressed={value === range.value}
          className={[
            "rounded-full px-2.5 py-1 text-[12px] font-medium transition",
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
