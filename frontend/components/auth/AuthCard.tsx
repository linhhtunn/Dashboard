"use client";

import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="dashboard-surface rounded-[1.15rem] p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="text-[1.35rem] font-semibold tracking-tight text-[color:var(--cs-heading)]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 text-[13px] leading-5 text-[color:var(--cs-text-soft)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
      {footer ? <div className="mt-6 border-t border-white/50 pt-5">{footer}</div> : null}
    </div>
  );
}
