"use client";

import { CheckCircle2, Layers3, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { MarkdownLite } from "@/components/common/MarkdownLite";
import {
  dashboardIssues,
  type IssueId,
} from "@/components/dashboard/dashboard-demo-data";
import { useLocale } from "@/components/providers/LocaleProvider";
import { MVP_BACKEND_PATIENT_ID } from "@/lib/ai/mvp-demo";
import { formatShortClockTime, localizeText } from "@/lib/i18n";
import type { AISummary } from "@/types";

type AIAnswerCardProps = {
  summary: AISummary;
  activeIssueId: IssueId | null;
  issueIds: IssueId[];
  onOpenIssue: (issueId: IssueId) => void;
  onToggleIssue: (issueId: IssueId) => void;
};

function getConfidenceLabel(
  confidence: AISummary["confidence"],
  locale: "vi" | "en",
) {
  switch (confidence) {
    case "high":
      return locale === "vi" ? "Độ tin cậy cao" : "High confidence";
    case "medium":
      return locale === "vi" ? "Độ tin cậy trung bình" : "Medium confidence";
    case "low":
      return locale === "vi" ? "Độ tin cậy thấp" : "Low confidence";
    default:
      return locale === "vi" ? "Chưa có độ tin cậy" : "No confidence level";
  }
}

export function AIAnswerCard({
  summary,
  activeIssueId,
  issueIds,
  onOpenIssue,
  onToggleIssue,
}: AIAnswerCardProps) {
  const { locale } = useLocale();
  const router = useRouter();
  const primaryFindings = summary.keyFindings.slice(0, 3);
  const visibleIssues = dashboardIssues.filter((issue) => issueIds.includes(issue.id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-7.5 w-7.5 items-center justify-center rounded-xl bg-[color:rgba(13,71,161,0.08)] text-[color:var(--cs-primary)]">
            <Sparkles className="h-4 w-4" />
          </div>

          <div>
            <p className="text-[15px] font-semibold text-[color:var(--cs-heading)]">
              {locale === "vi" ? "Tóm tắt từ AI lâm sàng" : "Clinical AI summary"}
            </p>
            <p className="text-[10px] text-[color:var(--cs-text-soft)]">
              {formatShortClockTime(summary.generatedAt, locale)}
            </p>
          </div>
        </div>

        <span className="rounded-full border border-[color:rgba(0,150,136,0.18)] bg-[color:rgba(0,150,136,0.1)] px-2.5 py-1 text-[12px] font-medium text-[color:#0B7A70]">
          {getConfidenceLabel(summary.confidence, locale)}
        </span>
      </div>

      <MarkdownLite
        content={summary.answer}
        className="space-y-2.5 text-[15px] leading-6 text-[color:var(--cs-text)]"
      />

      <div className="space-y-2">
        {primaryFindings.map((finding, index) => (
          <div
            key={`${finding}-${index}`}
            className="dashboard-fade-up flex items-start gap-2 text-[15px] leading-6 text-[color:var(--cs-text)]"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--cs-teal)]" />
            <span>{finding}</span>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <Layers3 className="h-4 w-4 text-[color:var(--cs-primary)]" />
          <p className="text-[15px] font-semibold text-[color:var(--cs-heading)]">
            {locale === "vi" ? "Phác đồ liên quan" : "Related protocols"}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {visibleIssues.map((issue) => {
            const active = activeIssueId === issue.id;

            return (
              <button
                key={issue.id}
                type="button"
                onClick={() => (active ? onToggleIssue(issue.id) : onOpenIssue(issue.id))}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[14px] transition",
                  active
                    ? "border-[color:rgba(13,71,161,0.22)] bg-[color:rgba(13,71,161,0.12)] text-[color:var(--cs-primary)]"
                    : "border-[color:rgba(13,71,161,0.14)] bg-white/70 text-[color:var(--cs-text)] hover:border-[color:rgba(13,71,161,0.22)] hover:text-[color:var(--cs-primary)]",
                ].join(" ")}
              >
                <span className="font-medium">
                  {localizeText(issue.actionLabel, locale)}
                </span>
                {active ? (
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-[color:var(--cs-primary)]">
                    {locale === "vi" ? "Đang mở" : "Open"}
                  </span>
                ) : null}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => router.push(`/patients/${MVP_BACKEND_PATIENT_ID}`)}
            className="inline-flex items-center gap-2 rounded-full border border-[color:rgba(0,150,136,0.18)] bg-[color:rgba(0,150,136,0.08)] px-3 py-1.5 text-[14px] font-medium text-[color:var(--cs-teal)] transition hover:bg-[color:rgba(0,150,136,0.14)]"
          >
            {locale === "vi" ? "Xem toàn bộ chỉ số" : "View all metrics"}
          </button>
        </div>
      </div>
    </div>
  );
}
