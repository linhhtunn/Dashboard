"use client";

import { Activity } from "lucide-react";

import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";

type BrandLogoProps = {
  showTagline?: boolean;
  compact?: boolean;
  variant?: "light" | "dark";
};

export function BrandLogo({
  showTagline = false,
  compact = false,
  variant = "light",
}: BrandLogoProps) {
  const ui = useClinicalUi();
  const textClass =
    variant === "dark" ? "text-white" : "text-[color:var(--cs-heading)]";
  const taglineClass =
    variant === "dark" ? "text-white/70" : "text-[color:var(--cs-text-soft)]";

  return (
    <div className="flex items-center gap-2.5">
      <span
        className={[
          "flex shrink-0 items-center justify-center rounded-[0.8rem] bg-[linear-gradient(135deg,var(--cs-primary),var(--cs-teal))] text-white shadow-[0_12px_26px_rgba(13,71,161,0.22)]",
          compact ? "h-9 w-9" : "h-11 w-11",
        ].join(" ")}
      >
        <Activity
          className={compact ? "h-[18px] w-[18px]" : "h-5 w-5"}
          strokeWidth={2}
        />
      </span>

      <div className="min-w-0">
        <p
          className={[
            "font-semibold tracking-[-0.025em]",
            compact ? "text-[1rem]" : "text-[1rem] sm:text-[1.05rem]",
            textClass,
          ].join(" ")}
        >
          {ui.appName}
          <span className="text-[color:var(--cs-teal)]"> {ui.appSuffix}</span>
        </p>
        {showTagline ? (
          <p className={["mt-0.5 text-[11px] leading-4", taglineClass].join(" ")}>
            E2E Simulation for AI Health
          </p>
        ) : null}
      </div>
    </div>
  );
}
