"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { AIComposer } from "@/components/dashboard/AIComposer";
import {
  ConversationThread,
  type ChatMessage,
} from "@/components/dashboard/ConversationThread";
import { SuggestedPromptList } from "@/components/dashboard/SuggestedPromptList";
import { type IssueId } from "@/components/dashboard/dashboard-demo-data";
import { useLocale } from "@/components/providers/LocaleProvider";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { streamAgentChat } from "@/lib/ai/chat-client";
import type { DashboardIssueId, ThreadMessage } from "@/lib/ai/types";
import type { AISummary } from "@/types";

type AIWorkspacePanelProps = {
  activeIssueId: IssueId | null;
  currentThreadId: string;
  initialMessages: ThreadMessage[];
  patientId: string;
  userId: string;
  onConversationStateChange: (hasConversation: boolean) => void;
  onOpenIssue: (issueId: IssueId) => void;
  onThreadUpdated: (meta: { title: string; lastIssue: string }) => Promise<void> | void;
  onToggleIssue: (issueId: IssueId) => void;
};

export function AIWorkspacePanel({
  activeIssueId,
  currentThreadId,
  initialMessages,
  patientId,
  userId,
  onConversationStateChange,
  onOpenIssue,
  onThreadUpdated,
  onToggleIssue,
}: AIWorkspacePanelProps) {
  const { locale } = useLocale();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialMessages.map((message, index) => ({
      id: `${currentThreadId}-${message.role}-${index}`,
      role: message.role,
      content: message.content,
    })),
  );
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [summaryIssueIds, setSummaryIssueIds] = useState<DashboardIssueId[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    onConversationStateChange(
      messages.some((message) => message.role === "user" || message.role === "assistant"),
    );
  }, [messages, onConversationStateChange]);

  const greeting = useMemo(() => getGreetingByHour(locale), [locale]);
  const prompts = useMemo(() => getPrompts(locale), [locale]);
  const placeholders = useMemo(() => getEmptyStatePlaceholders(locale), [locale]);
  const hasConversation = messages.length > 0;

  const handleSubmit = async (promptOverride?: string) => {
    const nextPrompt = (promptOverride ?? draft).trim();
    if (!nextPrompt || isThinking) return;

    const nextHistory = messages
      .filter(
        (message): message is ChatMessage & { role: "user" | "assistant" } =>
          message.role === "user" || message.role === "assistant",
      )
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: nextPrompt,
    };
    const assistantMessageId = `assistant-${Date.now()}`;

    setMessages((current) => [
      ...current,
      userMessage,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
      },
    ]);
    setDraft("");
    setIsThinking(true);
    setSummary(null);
    setSummaryIssueIds([]);

    try {
      let hasStartedStreaming = false;
      const payload = await streamAgentChat(
        {
          threadId: currentThreadId,
          patientId,
          locale,
          question: nextPrompt,
          message: nextPrompt,
          userId,
          history: nextHistory,
        },
        {
          onDelta: (event) => {
            if (!hasStartedStreaming) {
              hasStartedStreaming = true;
              setIsThinking(false);
            }
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessageId
                  ? { ...message, content: `${message.content}${event.text}` }
                  : message,
              ),
            );
          },
          onComplete: (event) => {
            setSummary(event.payload.summary);
            setSummaryIssueIds(event.payload.suggestedIssueIds);
            const primaryIssue = event.payload.recommendedIssueId ?? event.payload.suggestedIssueIds[0];
            if (primaryIssue) {
              onOpenIssue(primaryIssue as IssueId);
            }
          },
        },
      );

      const primaryIssue = payload.recommendedIssueId ?? payload.suggestedIssueIds[0];
      await onThreadUpdated({
        title: payload.title,
        lastIssue: getIssueDisplayLabel(primaryIssue, locale),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : locale === "vi"
            ? "Không thể lấy phản hồi từ hệ thống AI."
            : "Unable to reach the AI backend.";

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: errorMessage,
              }
            : message,
        ),
      );
    } finally {
      setIsThinking(false);
    }
  };

  if (!hasConversation && !isThinking) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-4">
          <div className="flex w-full max-w-[740px] flex-col items-center justify-center">
            <h1 className="text-center text-[2.35rem] font-semibold leading-[1.05] tracking-[-0.045em] text-[color:var(--cs-heading)]">
              {greeting}
            </h1>

            <div className="mt-6 w-full">
              <PlaceholdersAndVanishInput
                autoFocus
                className="mx-auto w-full max-w-[680px]"
                placeholders={placeholders}
                value={draft}
                onValueChange={setDraft}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setDraft(event.target.value);
                }}
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  void handleSubmit();
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="dashboard-scroll-area min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-1.5">
        <div className="mx-auto flex min-h-full w-full max-w-[820px] flex-col">
          <ConversationThread
            messages={messages.filter(
              (message) =>
                message.role !== "assistant" || message.content.trim().length > 0,
            )}
            activeIssueId={activeIssueId}
            isThinking={isThinking}
            onOpenIssue={onOpenIssue}
            onToggleIssue={onToggleIssue}
            summary={summary}
            summaryIssueIds={summaryIssueIds}
          />
        </div>
      </div>

      <div className="shrink-0 px-5 pb-1.5 pt-0.5">
        <div className="mx-auto w-full max-w-[720px]">
          <div className="mb-1.5 pl-1">
            <SuggestedPromptList
              prompts={prompts}
              onSelect={(prompt) => {
                void handleSubmit(prompt);
              }}
            />
          </div>
          <AIComposer
            className="mx-auto w-full"
            value={draft}
            onChange={setDraft}
            onSubmit={() => {
              void handleSubmit();
            }}
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
        "Oxy máu có đang thấp hơn mức cơ sở không?",
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

function getGreetingByHour(locale: "vi" | "en") {
  const hour = new Date().getHours();

  if (locale === "vi") {
    return hour < 12 ? "Chào buổi sáng, Bác sĩ" : "Chào buổi chiều, Bác sĩ";
  }

  return hour < 12 ? "Good morning, Doctor" : "Good afternoon, Doctor";
}

function getIssueDisplayLabel(
  issueId: DashboardIssueId | undefined | null,
  locale: "vi" | "en",
) {
  if (!issueId) {
    return locale === "vi" ? "Theo dõi tổng quát" : "General monitoring";
  }

  if (issueId === "spo2") {
    return locale === "vi" ? "Oxy máu thấp" : "Low SpO₂";
  }

  if (issueId === "blood_pressure") {
    return locale === "vi" ? "Huyết áp" : "Blood pressure";
  }

  return locale === "vi" ? "Nhịp tim" : "Heart rate";
}
