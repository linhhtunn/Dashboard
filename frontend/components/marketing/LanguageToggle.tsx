"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { Locale } from "@/types";

type LanguageToggleProps = {
  variant?: "light" | "dark";
};

export function LanguageToggle({ variant = "light" }: LanguageToggleProps) {
  const { locale, setLocale } = useLocale();
  const options: Locale[] = ["vi", "en"];

  return (
    <div
      className={[
        "inline-flex items-center rounded-[var(--radius-md)] p-0.5 text-[12px] font-semibold",
        variant === "dark"
          ? "bg-white/10 text-white/80"
          : "border border-[color:var(--cs-border)] bg-[color:var(--cs-surface)] text-[color:var(--cs-text-soft)]",
      ].join(" ")}
      role="group"
      aria-label="Language"
    >
      {options.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={[
            "rounded-[6px] px-2.5 py-1 uppercase transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--cs-primary)]",
            locale === code
              ? variant === "dark"
                ? "bg-white text-[color:var(--cs-primary)]"
                : "bg-white text-[color:var(--cs-primary)] shadow-sm"
              : "hover:opacity-80",
          ].join(" ")}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
