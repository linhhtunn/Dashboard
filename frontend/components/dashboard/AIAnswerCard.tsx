import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

import type { AISummary } from "@/types";

type AIAnswerCardProps = {
  summary: AISummary;
};

function getConfidenceLabel(confidence: AISummary["confidence"]) {
  switch (confidence) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "low":
      return "Low confidence";
    default:
      return "Confidence unavailable";
  }
}

export function AIAnswerCard({ summary }: AIAnswerCardProps) {
  return (
    <div className="rounded-[1.35rem] border border-[color:var(--cs-border)] bg-white shadow-[0_16px_34px_rgba(13,71,161,0.06)]">
      <div className="border-b dashboard-subtle-divider px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:rgba(13,71,161,0.08)] text-[color:var(--cs-primary)]">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
                AI clinical response
              </p>
              <p className="text-xs text-[color:var(--cs-text-soft)]">
                {summary.generatedAt}
              </p>
            </div>
          </div>

          <span className="rounded-full border border-[color:rgba(0,150,136,0.18)] bg-[color:rgba(0,150,136,0.08)] px-3 py-1 text-xs font-medium text-[color:#0B7A70]">
            {getConfidenceLabel(summary.confidence)}
          </span>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5">
        <div>
          <p className="text-[15px] leading-7 text-[color:var(--cs-text)]">
            {summary.answer}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
            Summary highlights
          </p>
          <div className="mt-3 space-y-2">
            {summary.keyFindings.map((finding) => (
              <div
                key={finding}
                className="flex items-start gap-2 text-sm text-[color:var(--cs-text)]"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--cs-teal)]" />
                <span>{finding}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.15rem] border border-[color:var(--cs-border)] bg-[color:rgba(248,250,252,0.85)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--cs-text-soft)]">
            Evidence routing
          </p>
          <p className="mt-1 text-sm text-[color:var(--cs-text)]">
            Evidence chi tiet se duoc hien thi o patient summary panel ben phai
            de doi chieu cung vitals, alerts, va clinical context.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-[1.15rem] border border-[color:rgba(0,150,136,0.15)] bg-[color:rgba(0,150,136,0.05)] px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-[color:var(--cs-teal)]">
            <ShieldCheck className="h-4 w-4" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--cs-text-soft)]">
              Disclaimer
            </p>
            <p className="mt-1 text-sm text-[color:var(--cs-text)]">
              AI support only. Not a diagnosis. Always use clinical judgment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
