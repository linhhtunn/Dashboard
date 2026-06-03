"use client";

import { CheckCircle2, Layers3, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  dashboardIssues,
  type IssueId,
} from "@/components/dashboard/dashboard-demo-data";
import type { AISummary } from "@/types";

type AIAnswerCardProps = {
  summary: AISummary;
  activeIssueId: IssueId | null;
  onOpenIssue: (issueId: IssueId) => void;
  onToggleIssue: (issueId: IssueId) => void;
};

function getConfidenceLabel(confidence: AISummary["confidence"]) {
  switch (confidence) {
    case "high":
      return "Độ tin cậy cao";
    case "medium":
      return "Độ tin cậy trung bình";
    case "low":
      return "Độ tin cậy thấp";
    default:
      return "Chưa có độ tin cậy";
  }
}

export function AIAnswerCard({
  summary,
  activeIssueId,
  onOpenIssue,
  onToggleIssue,
}: AIAnswerCardProps) {
  const router = useRouter();
  const primaryFindings = summary.keyFindings.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[color:rgba(13,71,161,0.08)] text-[color:var(--cs-primary)]">
            <Sparkles className="h-4.5 w-4.5" />
          </div>

          <div>
            <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
              Tóm tắt từ AI lâm sàng
            </p>
            <p className="text-[11px] text-[color:var(--cs-text-soft)]">
              {summary.generatedAt}
            </p>
          </div>
        </div>

        <span className="rounded-full border border-[color:rgba(0,150,136,0.18)] bg-[color:rgba(0,150,136,0.1)] px-2.5 py-1 text-[11px] font-medium text-[color:#0B7A70]">
          {getConfidenceLabel(summary.confidence)}
        </span>
      </div>

      <p className="text-[15px] leading-7 text-[color:var(--cs-text)]">
        {summary.answer}
      </p>

      <div className="space-y-2.5">
        {primaryFindings.map((finding, index) => (
          <div
            key={finding}
            className="dashboard-fade-up flex items-start gap-2 text-sm text-[color:var(--cs-text)]"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--cs-teal)]" />
            <span>{finding}</span>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <Layers3 className="h-4 w-4 text-[color:var(--cs-primary)]" />
          <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
            Phác đồ liên quan
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {dashboardIssues.map((issue) => {
            const active = activeIssueId === issue.id;

            return (
              <button
                key={issue.id}
                type="button"
                onClick={() => (active ? onToggleIssue(issue.id) : onOpenIssue(issue.id))}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                  active
                    ? "border-[color:rgba(13,71,161,0.22)] bg-[color:rgba(13,71,161,0.12)] text-[color:var(--cs-primary)]"
                    : "border-[color:rgba(13,71,161,0.14)] bg-white/70 text-[color:var(--cs-text)] hover:border-[color:rgba(13,71,161,0.22)] hover:text-[color:var(--cs-primary)]",
                ].join(" ")}
              >
                <span className="font-medium">{issue.actionLabel}</span>
                {active ? (
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-[color:var(--cs-primary)]">
                    Đang mở
                  </span>
                ) : null}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => router.push("/patients/patient-a")}
            className="inline-flex items-center gap-2 rounded-full border border-[color:rgba(0,150,136,0.18)] bg-[color:rgba(0,150,136,0.08)] px-3 py-1.5 text-sm font-medium text-[color:var(--cs-teal)] transition hover:bg-[color:rgba(0,150,136,0.14)]"
          >
            Xem toàn bộ chỉ số
          </button>
        </div>
      </div>
    </div>
  );
}
