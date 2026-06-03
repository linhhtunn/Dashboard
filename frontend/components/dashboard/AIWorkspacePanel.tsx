"use client";

import { useEffect, useMemo, useState } from "react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { AIComposer } from "@/components/dashboard/AIComposer";
import {
  ConversationThread,
  type ChatMessage,
} from "@/components/dashboard/ConversationThread";
import { type IssueId } from "@/components/dashboard/dashboard-demo-data";
import { SuggestedPromptList } from "@/components/dashboard/SuggestedPromptList";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";

type AIWorkspacePanelProps = {
  sessionId: number;
  activeIssueId: IssueId | null;
  onConversationStateChange: (hasConversation: boolean) => void;
  onOpenIssue: (issueId: IssueId) => void;
  onStartConversation: (prompt: string) => void;
  onToggleIssue: (issueId: IssueId) => void;
};

export function AIWorkspacePanel({
  sessionId,
  activeIssueId,
  onConversationStateChange,
  onOpenIssue,
  onStartConversation,
  onToggleIssue,
}: AIWorkspacePanelProps) {
  const { locale } = useLocale();
  const [draft, setDraft] = useState("");
  const [hasConversation, setHasConversation] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    buildSeededMessages(locale),
  );

  const greeting = useMemo(() => getGreetingByHour(locale), [locale]);
  const prompts = useMemo(() => getPrompts(locale), [locale]);
  const placeholders = useMemo(() => getEmptyStatePlaceholders(locale), [locale]);

  useEffect(() => {
    onConversationStateChange(false);
  }, [onConversationStateChange, sessionId]);

  useEffect(() => {
    if (!isThinking) return;

    const timer = window.setTimeout(() => {
      setMessages((current) => {
        const lastUserMessage = [...current]
          .reverse()
          .find((item) => item.role === "user");
        const prompt = lastUserMessage?.content ?? "";

        return [
          ...current,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: buildAssistantReply(prompt, locale),
          },
        ];
      });
      setIsThinking(false);
      setHasConversation(true);
      onConversationStateChange(true);
    }, 1100);

    return () => window.clearTimeout(timer);
  }, [isThinking, locale, onConversationStateChange]);

  const handleSubmit = (promptOverride?: string) => {
    const nextPrompt = (promptOverride ?? draft).trim();
    if (!nextPrompt || isThinking) return;

    if (!hasConversation) {
      onStartConversation(nextPrompt);
    }

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: nextPrompt,
      },
    ]);
    setDraft("");
    setIsThinking(true);
    setHasConversation(true);
  };

  if (!hasConversation && !isThinking) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-5">
          <div className="flex w-full max-w-[740px] flex-col items-center justify-center">
            <h1 className="text-center text-[2.75rem] font-semibold leading-[1.1] tracking-[-0.05em] text-[color:var(--cs-heading)]">
              {greeting}
            </h1>

            <div className="mt-8 w-full">
              <PlaceholdersAndVanishInput
                autoFocus
                className="mx-auto w-full max-w-[680px]"
                placeholders={placeholders}
                value={draft}
                onValueChange={setDraft}
                onChange={(event) => setDraft(event.target.value)}
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSubmit();
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full max-h-full flex-col">
      <div className="dashboard-scroll-area max-h-full flex-1 overflow-y-auto px-6 pb-3 pt-2">
        <div className="mx-auto flex min-h-full w-full max-w-[820px] flex-col">
          <ConversationThread
            messages={messages}
            activeIssueId={activeIssueId}
            isThinking={isThinking}
            onOpenIssue={onOpenIssue}
            onToggleIssue={onToggleIssue}
          />
        </div>
      </div>

      <div className="shrink-0 px-6 pb-2 pt-1">
        <div className="mx-auto w-full max-w-[720px]">
          <div className="mb-2 pl-1">
            <SuggestedPromptList prompts={prompts} onSelect={handleSubmit} />
          </div>
          <AIComposer
            className="mx-auto w-full"
            value={draft}
            onChange={setDraft}
            onSubmit={() => handleSubmit()}
          />
        </div>
      </div>
    </div>
  );
}

function getPrompts(locale: "vi" | "en") {
  return locale === "vi"
    ? [
        "Tóm tắt tình trạng hiện tại",
        "Có thay đổi gì trong 1 giờ qua?",
        "Rủi ro diễn tiến xấu?",
        "Chỉ số nào cần ưu tiên theo dõi?",
      ]
    : [
        "Summarize the current status",
        "What changed in the last hour?",
        "Any risk of deterioration?",
        "Which metric should be prioritized?",
      ];
}

function getEmptyStatePlaceholders(locale: "vi" | "en") {
  return locale === "vi"
    ? [
        "Tóm tắt nhanh tình trạng hiện tại của bệnh nhân",
        "SpO₂ có đang thấp hơn baseline không?",
        "Có thay đổi gì trong 1 giờ qua?",
        "Nhịp tim và huyết áp đang lệch theo hướng nào?",
      ]
    : [
        "Quickly summarize the patient's current condition",
        "Is SpO₂ below baseline right now?",
        "What changed in the last hour?",
        "How are heart rate and blood pressure trending?",
      ];
}

function buildSeededMessages(locale: "vi" | "en"): ChatMessage[] {
  return locale === "vi"
    ? [
        {
          id: "seed-user-1",
          role: "user",
          content: "Tóm tắt nhanh diễn biến trong ca trực vừa rồi.",
        },
        {
          id: "seed-assistant-1",
          role: "assistant",
          content:
            "Trong 2 giờ gần nhất, bệnh nhân ổn định tương đối, chưa có cảnh báo critical mới. SpO₂ thấp hơn baseline nhẹ và huyết áp tâm thu tăng nhẹ khi nghỉ.",
        },
      ]
    : [
        {
          id: "seed-user-1",
          role: "user",
          content: "Give me a quick summary of the last shift.",
        },
        {
          id: "seed-assistant-1",
          role: "assistant",
          content:
            "Over the last 2 hours, the patient has remained relatively stable with no new critical alerts. SpO₂ is slightly below baseline and systolic blood pressure is mildly elevated at rest.",
        },
      ];
}

function getGreetingByHour(locale: "vi" | "en") {
  const hour = new Date().getHours();

  if (locale === "vi") {
    return hour < 12 ? "Chào buổi sáng, Bác sĩ" : "Chào buổi chiều, Bác sĩ";
  }

  return hour < 12 ? "Good morning, Doctor" : "Good afternoon, Doctor";
}

function buildAssistantReply(prompt: string, locale: "vi" | "en") {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes("spo2") || lowerPrompt.includes("oxy")) {
    return locale === "vi"
      ? "SpO₂ hiện thấp hơn baseline nhẹ. Nên mở phác đồ SpO₂ để kiểm tra cảm biến, đối chiếu triệu chứng hô hấp và theo dõi xu hướng 15 phút tới."
      : "SpO₂ is slightly below baseline. Open the SpO₂ protocol to verify the sensor, compare respiratory symptoms, and watch the next 15-minute trend.";
  }

  if (
    lowerPrompt.includes("huyết áp") ||
    lowerPrompt.includes("blood pressure")
  ) {
    return locale === "vi"
      ? "Huyết áp tâm thu đang tăng nhẹ khi nghỉ. Nên rà soát lại tư thế đo, thời điểm dùng thuốc và so sánh với cửa sổ 15 phút gần nhất."
      : "Systolic blood pressure is mildly elevated at rest. Review measurement posture, medication timing, and compare it with the latest 15-minute window.";
  }

  if (
    lowerPrompt.includes("nhịp tim") ||
    lowerPrompt.includes("heart rate") ||
    lowerPrompt.includes("hrv")
  ) {
    return locale === "vi"
      ? "Nhịp tim và HRV cần được đặt trong cùng bối cảnh với SpO₂ và mức hoạt động nghỉ ngơi. Có thể mở phác đồ nhịp tim để xem chỉ số liên quan."
      : "Heart rate and HRV should be interpreted alongside SpO₂ and resting activity level. You can open the heart rate protocol to review related metrics.";
  }

  return locale === "vi"
    ? "Tổng quan hiện tại cho thấy bệnh nhân chưa có dấu hiệu cần can thiệp khẩn, nhưng vẫn nên tiếp tục theo dõi SpO₂ và huyết áp tâm thu vì cả hai đang lệch nhẹ so với baseline gần đây."
    : "The current overview suggests the patient does not need urgent intervention, but SpO₂ and systolic blood pressure should continue to be monitored because both are slightly offset from recent baseline.";
}
