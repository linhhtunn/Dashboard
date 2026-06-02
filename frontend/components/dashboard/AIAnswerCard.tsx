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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0D47A1]/10 text-[#0D47A1]">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                AI clinical response
              </p>
              <p className="text-xs text-slate-500">{summary.generatedAt}</p>
            </div>
          </div>

          <span className="rounded-full border border-[#009688]/20 bg-[#009688]/8 px-3 py-1 text-xs font-medium text-[#0B7A70]">
            {getConfidenceLabel(summary.confidence)}
          </span>
        </div>
      </div>

      <div className="space-y-5 px-4 py-4">
        <div>
          <p className="text-sm leading-7 text-slate-700">{summary.answer}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">Summary highlights</p>
          <div className="mt-3 space-y-2">
            {summary.keyFindings.map((finding) => (
              <div key={finding} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#009688]" />
                <span>{finding}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Evidence routing
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Evidence chi tiet se duoc hien thi o patient summary panel ben phai
            de doi chieu cung vitals, alerts, va clinical context.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-[#009688]/15 bg-[#009688]/5 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-[#009688]">
            <ShieldCheck className="h-4 w-4" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Disclaimer
            </p>
            <p className="mt-1 text-sm text-slate-700">
              AI support only. Not a diagnosis. Always use clinical judgment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
