import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

import type { AISummary } from "@/types";

type AIAnswerCardProps = {
  summary: AISummary;
};

function getConfidenceLabel(confidence: AISummary["confidence"]) {
  switch (confidence) {
    case "high":
      return "Do tin cay cao";
    case "medium":
      return "Do tin cay trung binh";
    case "low":
      return "Do tin cay thap";
    default:
      return "Chua co do tin cay";
  }
}

export function AIAnswerCard({ summary }: AIAnswerCardProps) {
  const primaryFindings = summary.keyFindings.slice(0, 2);
  const secondaryFindings = summary.keyFindings.slice(2);

  return (
    <div className="dashboard-glass-soft rounded-[1.35rem]">
      <div className="border-b dashboard-subtle-divider px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:rgba(13,71,161,0.08)] text-[color:var(--cs-primary)]">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
                Tom tat tu AI lam sang
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
            Diem chinh can luu y
          </p>
          <div className="mt-3 space-y-2">
            {primaryFindings.map((finding) => (
              <div
                key={finding}
                className="flex items-start gap-2 text-sm text-[color:var(--cs-text)]"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--cs-teal)]" />
                <span>{finding}</span>
              </div>
            ))}
          </div>

          {secondaryFindings.length > 0 ? (
            <details className="dashboard-details mt-3 rounded-[1rem] border border-[color:rgba(13,71,161,0.12)] bg-[color:rgba(255,255,255,0.45)] px-3 py-3">
              <summary className="cursor-pointer text-sm font-medium text-[color:var(--cs-primary)]">
                Xem them {secondaryFindings.length} nhan dinh
              </summary>
              <div className="mt-3 space-y-2">
                {secondaryFindings.map((finding) => (
                  <div
                    key={finding}
                    className="flex items-start gap-2 text-sm text-[color:var(--cs-text)]"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--cs-teal)]" />
                    <span>{finding}</span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>

        <div className="dashboard-glass-soft rounded-[1.15rem] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--cs-text-soft)]">
            Vi tri doi chieu bang chung
          </p>
          <p className="mt-1 text-sm text-[color:var(--cs-text)]">
            Bang chung chi tiet se duoc hien thi o panel tong quan benh nhan ben
            phai de doi chieu cung chi so sinh ton va boi canh lam sang.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-[1.15rem] border border-[color:rgba(0,150,136,0.15)] bg-[color:rgba(255,255,255,0.44)] px-4 py-3 backdrop-blur-[16px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-[color:var(--cs-teal)]">
            <ShieldCheck className="h-4 w-4" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--cs-text-soft)]">
              Luu y
            </p>
            <p className="mt-1 text-sm text-[color:var(--cs-text)]">
              Chi ho tro tham khao. Khong phai chan doan. Luon can danh gia
              lam sang cua bac si.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
