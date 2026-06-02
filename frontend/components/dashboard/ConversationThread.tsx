import { Bot, MessageSquareText, ShieldCheck } from "lucide-react";

import { AIAnswerCard } from "@/components/dashboard/AIAnswerCard";
import type { AISummary } from "@/types";

function EmptyThreadCard() {
  return (
    <div className="rounded-[1.3rem] border border-dashed border-[color:var(--cs-border-strong)] bg-[color:rgba(248,250,252,0.88)] px-5 py-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[color:var(--cs-primary)] shadow-sm">
          <MessageSquareText className="h-5 w-5" />
        </div>

        <div>
          <h3 className="text-base font-semibold text-[color:var(--cs-heading)]">
            Suggested interaction flow
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--cs-text-soft)]">
            Dat cau hoi ngan, nhan summary co huong hanh dong, sau do kiem chung
            evidence ben panel phai.
          </p>
        </div>
      </div>
    </div>
  );
}

function StarterSystemNote() {
  return (
    <div className="flex items-start gap-3 rounded-[1.3rem] border border-[color:var(--cs-border)] bg-white px-4 py-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:rgba(13,71,161,0.08)] text-[color:var(--cs-primary)]">
        <Bot className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
            CareSignal AI workspace
          </p>
          <span className="rounded-full bg-[color:rgba(13,71,161,0.06)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--cs-primary)]">
            Summary mode
          </span>
        </div>

        <p className="mt-2 text-sm leading-6 text-[color:var(--cs-text-soft)]">
          Workspace nay uu tien trao doi voi AI truoc, sau do moi doi chieu voi
          patient context ben panel phai. AI output o day chi nen la summary
          ngan gon, khong phai noi dung giai trinh day du.
        </p>
      </div>
    </div>
  );
}

function UserPromptBubble() {
  return (
    <div className="ml-auto max-w-[78%] rounded-[1.15rem] border border-[color:rgba(13,71,161,0.12)] bg-[color:rgba(13,71,161,0.07)] px-4 py-3 text-[color:var(--cs-heading)]">
      <p className="text-sm font-medium">Patient A co dang on dinh khong?</p>
      <p className="mt-2 text-xs text-[color:var(--cs-text-soft)]">You - 09:41 AM</p>
    </div>
  );
}

const demoSummary: AISummary = {
  patientId: "patient-a",
  locale: "vi",
  question: "Patient A co dang on dinh khong?",
  answer:
    "Patient A hien chua co dau hieu can thiep khan, nhung van nen tiep tuc theo doi do SpO2 thap hon baseline nhe va huyet ap tam thu dang o dau tren cua nguong du kien khi nghi.",
  keyFindings: [
    "Khong co bang chung cua alert critical moi trong 15 phut gan day.",
    "SpO2 dang thap hon baseline gan day nhung chua xuong duoi nguong can thiep.",
    "Can tiep tuc theo doi boi canh lam sang va xac nhan xu huong tiep theo.",
  ],
  status: "ready",
  confidence: "medium",
  evidence: [
    {
      kind: "metric_threshold",
      metric: "spo2",
      value: 94,
      unit: "%",
      timestamp: "2026-06-02T09:39:00Z",
    },
    {
      kind: "trend_change",
      metric: "systolic_bp",
      value: 124,
      unit: "mmHg",
      comparisonValue: 118,
      comparisonWindow: "15m",
      timestamp: "2026-06-02T09:40:00Z",
    },
    {
      kind: "trend_change",
      metric: "heart_rate",
      value: 82,
      unit: "bpm",
      comparisonValue: 76,
      comparisonWindow: "15m",
      timestamp: "2026-06-02T09:40:00Z",
    },
  ],
  generatedAt: "2026-06-02T09:41:00Z",
  disclaimerKey: "ai_support_only",
};

function AIAnswerBlock() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:rgba(13,71,161,0.08)] text-[color:var(--cs-primary)]">
          <Bot className="h-5 w-5" />
        </div>

        <div>
          <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
            CareSignal AI
          </p>
          <p className="text-xs text-[color:var(--cs-text-soft)]">
            Summary-only response
          </p>
        </div>
      </div>

      <AIAnswerCard summary={demoSummary} />
    </div>
  );
}

function WorkspaceFooterNote() {
  return (
    <div className="flex items-start gap-3 rounded-[1.2rem] border border-[color:rgba(0,150,136,0.16)] bg-[color:rgba(0,150,136,0.05)] px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-[color:var(--cs-teal)]">
        <ShieldCheck className="h-4 w-4" />
      </div>

      <div>
        <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
          Clinical reminder
        </p>
        <p className="mt-1 text-sm leading-6 text-[color:var(--cs-text-soft)]">
          Dung AI nhu lop tong hop thong tin dau tien, sau do kiem chung context
          va evidence ben panel summary truoc khi hanh dong.
        </p>
      </div>
    </div>
  );
}

export function ConversationThread() {
  return (
    <div className="flex min-h-full flex-col gap-5">
      <StarterSystemNote />
      <UserPromptBubble />
      <AIAnswerBlock />
      <EmptyThreadCard />
      <WorkspaceFooterNote />
    </div>
  );
}
