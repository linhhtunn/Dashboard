"use client";

import { AlertTriangle } from "lucide-react";

import type { AgentFallbackKind } from "@/lib/ai/agent-fallback";
import { getAgentFallbackCopy } from "@/lib/ai/agent-fallback";
import type { Locale } from "@/types";

type AgentErrorBannerProps = {
  kind: AgentFallbackKind;
  locale: Locale;
  patientId?: string;
  className?: string;
};

export function AgentErrorBanner({
  kind,
  locale,
  patientId,
  className = "",
}: AgentErrorBannerProps) {
  const copy = getAgentFallbackCopy(kind, locale, patientId);

  return (
    <div
      className={[
        "rounded-[0.85rem] border border-[color:rgba(229,72,77,0.22)] bg-[linear-gradient(135deg,rgba(229,72,77,0.08),rgba(255,255,255,0.5))] px-3.5 py-3",
        className,
      ].join(" ")}
    >
      <div className="flex gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:rgba(229,72,77,0.12)] text-[color:var(--cs-danger)]">
          <AlertTriangle className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[color:var(--cs-danger)]">
            {copy.title}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-[color:var(--cs-text)]">
            {copy.description}
          </p>
          {copy.hint ? (
            <p className="mt-1.5 text-[10px] leading-4 text-[color:var(--cs-text-soft)]">
              {copy.hint}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
