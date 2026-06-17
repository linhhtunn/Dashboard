import type { InputHTMLAttributes, ReactNode } from "react";

type AuthFieldProps = {
  label: string;
  hint?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export function AuthField({ label, hint, className = "", ...props }: AuthFieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-semibold text-[color:var(--cs-text)]">{label}</span>
      <input
        className={[
          "dashboard-input h-11 w-full rounded-[0.75rem] px-3 text-[14px]",
          className,
        ].join(" ")}
        {...props}
      />
      {hint ? <span className="block text-[11px] text-[color:var(--cs-text-soft)]">{hint}</span> : null}
    </label>
  );
}
