"use client";

import { useLocale } from "@/components/providers/LocaleProvider";

export function TimeRangeSelector() {
  const { locale } = useLocale();
  const ranges = locale === "vi"
    ? [
        { label: "15 phút", active: true },
        { label: "1 giờ", active: false },
        { label: "6 giờ", active: false },
      ]
    : [
        { label: "15 min", active: true },
        { label: "1 hour", active: false },
        { label: "6 hours", active: false },
      ];

  return (
    <div
      className="inline-flex rounded-full border border-[color:rgba(13,71,161,0.12)] bg-white/70 p-1"
      aria-label={locale === "vi" ? "Khoảng thời gian" : "Time range"}
    >
      {ranges.map((range) => (
        <button
          key={range.label}
          type="button"
          disabled={!range.active}
          aria-pressed={range.active}
          className={[
            "rounded-full px-3 py-1.5 text-sm font-medium transition",
            range.active
              ? "bg-[linear-gradient(135deg,rgba(13,71,161,0.96),rgba(0,150,136,0.76))] text-white"
              : "cursor-not-allowed text-[color:var(--cs-text-soft)] opacity-45",
          ].join(" ")}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
