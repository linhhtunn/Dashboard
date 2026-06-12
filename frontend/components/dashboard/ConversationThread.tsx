"use client";

import { Sparkles } from "lucide-react";

import {
  AssistantTextBubble,
  SystemBubble,
  ThinkingBlock,
  UserPromptBubble,
} from "@/components/chat/ChatBubbles";
import { AIAnswerCard } from "@/components/dashboard/AIAnswerCard";
import type { IssueId } from "@/components/dashboard/dashboard-demo-data";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { DashboardIssueId } from "@/lib/ai/types";
import type { AISummary } from "@/types";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

type ConversationThreadProps = {
  messages: ChatMessage[];
  activeIssueId: IssueId | null;
  isThinking: boolean;
  onOpenIssue: (issueId: IssueId) => void;
  onToggleIssue: (issueId: IssueId) => void;
  summary: AISummary | null;
  summaryIssueIds: DashboardIssueId[];
};

export function ConversationThread({
  messages,
  activeIssueId,
  isThinking,
  onOpenIssue,
  onToggleIssue,
  summary,
  summaryIssueIds,
}: ConversationThreadProps) {
  const { locale } = useLocale();
  const thinkingLabel =
    locale === "vi"
      ? "Đang tổng hợp diễn biến từ hệ thống AI"
      : "Summarizing changes from the AI backend";
  const dedupedMessages = removeDuplicatedAssistantSummary(messages, summary);

  return (
    <div className="flex min-h-full flex-col gap-3 pb-3">
      {dedupedMessages.map((message) => {
        if (message.role === "user") {
          return <UserPromptBubble key={message.id} prompt={message.content} />;
        }

        if (message.role === "system") {
          return <SystemBubble key={message.id} content={message.content} />;
        }

        return <AssistantTextBubble key={message.id} content={message.content} />;
      })}

      {isThinking ? <ThinkingBlock label={thinkingLabel} /> : null}

      {summary ? (
        <div className="dashboard-fade-up flex gap-2.5">
          <div className="hidden pt-1 sm:block">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:rgba(13,71,161,0.08)] text-[color:var(--cs-primary)]">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <AIAnswerCard
              summary={summary}
              activeIssueId={activeIssueId}
              issueIds={summaryIssueIds as IssueId[]}
              onOpenIssue={onOpenIssue}
              onToggleIssue={onToggleIssue}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function removeDuplicatedAssistantSummary(
  messages: ChatMessage[],
  summary: AISummary | null,
) {
  if (!summary) return messages;

  const latestAssistantIndex = [...messages]
    .map((message, index) => ({ message, index }))
    .reverse()
    .find((entry) => entry.message.role === "assistant")?.index;

  if (latestAssistantIndex === undefined) return messages;

  return messages.filter((message, index) => {
    if (index !== latestAssistantIndex || message.role !== "assistant") {
      return true;
    }

    return normalizeForCompare(message.content) !== normalizeForCompare(summary.answer);
  });
}

function normalizeForCompare(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
