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
  const textClass =
    variant === "dark" ? "text-white" : "text-[color:var(--cs-heading)]";
  const taglineClass =
    variant === "dark" ? "text-white/70" : "text-[color:var(--cs-text-soft)]";

  return (
    <div className="flex items-center gap-3">
      <span
        className={[
          "relative flex shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[linear-gradient(135deg,var(--cs-primary),var(--cs-teal))] text-white shadow-[var(--shadow-card)]",
          compact ? "h-9 w-9" : "h-11 w-11",
        ].join(" ")}
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          className={compact ? "h-5 w-5" : "h-6 w-6"}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 3.5 5 6.25V11.2c0 4.1 2.98 7.92 7 8.8 4.02-.88 7-4.7 7-8.8V6.25L12 3.5Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M7.5 12.2c1.2 1.35 2.7 2.1 4.5 2.1s3.3-.75 4.5-2.1"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M16.8 7.4 18.6 6l.9 1.55"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>

      <div className="min-w-0">
        <p
          className={[
            "font-semibold tracking-[-0.02em]",
            compact ? "text-[1rem]" : "text-[1.1rem]",
            textClass,
          ].join(" ")}
        >
          CareSignal <span className="text-[color:var(--cs-teal)]">AI</span>
        </p>
        {showTagline ? (
          <p className={["mt-0.5 text-[12px] leading-4", taglineClass].join(" ")}>
            E2E Simulation for AI Health
          </p>
        ) : null}
      </div>
    </div>
  );
}
