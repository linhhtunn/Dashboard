"use client";

import { useEffect, useMemo, useState } from "react";

import { AIComposer } from "@/components/dashboard/AIComposer";
import {
  ConversationThread,
  type ChatMessage,
} from "@/components/dashboard/ConversationThread";
import { type IssueId } from "@/components/dashboard/dashboard-demo-data";
import { SuggestedPromptList } from "@/components/dashboard/SuggestedPromptList";

type AIWorkspacePanelProps = {
  sessionId: number;
  activeIssueId: IssueId | null;
  onConversationStateChange: (hasConversation: boolean) => void;
  onOpenIssue: (issueId: IssueId) => void;
  onStartConversation: (prompt: string) => void;
  onToggleIssue: (issueId: IssueId) => void;
};

const prompts = [
  "Tóm tắt tình trạng hiện tại",
  "Có thay đổi gì trong 1 giờ qua?",
  "Rủi ro diễn tiến xấu?",
  "Chỉ số nào cần ưu tiên theo dõi?",
];

const seededMessages: ChatMessage[] = [
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
];

function getGreetingByHour() {
  const hour = new Date().getHours();
  return hour < 12 ? "Chào buổi sáng bác sĩ" : "Chào buổi chiều bác sĩ";
}

function buildAssistantReply(prompt: string) {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes("spo2") || lowerPrompt.includes("oxy")) {
    return "SpO₂ hiện thấp hơn baseline nhẹ. Nên mở phác đồ SpO₂ để kiểm tra cảm biến, đối chiếu triệu chứng hô hấp và theo dõi xu hướng 15 phút tới.";
  }

  if (lowerPrompt.includes("huyết áp")) {
    return "Huyết áp tâm thu đang tăng nhẹ khi nghỉ. Nên rà soát lại tư thế đo, thời điểm dùng thuốc và so sánh với cửa sổ 15 phút gần nhất.";
  }

  if (lowerPrompt.includes("nhịp tim") || lowerPrompt.includes("hrv")) {
    return "Nhịp tim và HRV cần được đặt trong cùng bối cảnh với SpO₂ và mức hoạt động nghỉ ngơi. Có thể mở phác đồ nhịp tim để xem chỉ số liên quan.";
  }

  return "Tổng quan hiện tại cho thấy bệnh nhân chưa có dấu hiệu cần can thiệp khẩn, nhưng vẫn nên tiếp tục theo dõi SpO₂ và huyết áp tâm thu vì cả hai đang lệch nhẹ so với baseline gần đây.";
}

export function AIWorkspacePanel({
  sessionId,
  activeIssueId,
  onConversationStateChange,
  onOpenIssue,
  onStartConversation,
  onToggleIssue,
}: AIWorkspacePanelProps) {
  const [draft, setDraft] = useState("");
  const [hasConversation, setHasConversation] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(seededMessages);

  const greeting = useMemo(() => getGreetingByHour(), []);

  useEffect(() => {
    setDraft("");
    setHasConversation(false);
    setIsThinking(false);
    setMessages(seededMessages);
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
            content: buildAssistantReply(prompt),
          },
        ];
      });
      setIsThinking(false);
      setHasConversation(true);
      onConversationStateChange(true);
    }, 1100);

    return () => window.clearTimeout(timer);
  }, [isThinking, onConversationStateChange]);

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
              <AIComposer
                autoFocus
                className="mx-auto w-full max-w-[680px]"
                value={draft}
                onChange={setDraft}
                onSubmit={() => handleSubmit()}
                placeholder="Hỏi về SpO₂, huyết áp, nhịp tim hoặc một diễn biến cần ưu tiên theo dõi..."
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="dashboard-scroll-area min-h-0 flex-1 overflow-y-auto px-6 pb-3 pt-2">
        <div className="mx-auto w-full max-w-[820px]">
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
