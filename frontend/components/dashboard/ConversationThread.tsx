import { Bot, MessageSquareText } from "lucide-react";

import { AIAnswerCard } from "@/components/dashboard/AIAnswerCard";
import type { AISummary } from "@/types";

function EmptyThreadCard() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 px-5 py-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#0D47A1] shadow-sm">
          <MessageSquareText className="h-5 w-5" />
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">Conversation-ready layout</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Thread da san sang cho flow hoi dap nhieu luot. Commit nay them AI
            answer card dang summary-first: panel trai chi tra loi ngan gon,
            con evidence se duoc day sang patient summary panel.
          </p>
        </div>
      </div>
    </div>
  );
}

function StarterSystemNote() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0D47A1]/10 text-[#0D47A1]">
        <Bot className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">
            CareSignal AI workspace
          </p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            Commit 3
          </span>
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-600">
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
    <div className="ml-auto max-w-[85%] rounded-2xl bg-[#0D47A1] px-4 py-3 text-white shadow-[0_10px_25px_rgba(13,71,161,0.18)]">
      <p className="text-sm font-medium">Patient A co dang on dinh khong?</p>
      <p className="mt-2 text-xs text-white/75">You • 09:41 AM</p>
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
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0D47A1]/10 text-[#0D47A1]">
          <Bot className="h-5 w-5" />
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">CareSignal AI</p>
          <p className="text-xs text-slate-500">Summary-only response</p>
        </div>
      </div>

      <AIAnswerCard summary={demoSummary} />
    </div>
  );
}

export function ConversationThread() {
  return (
    <div className="flex min-h-full flex-col gap-4">
      <StarterSystemNote />
      <UserPromptBubble />
      <AIAnswerBlock />
      <EmptyThreadCard />
    </div>
  );
}
