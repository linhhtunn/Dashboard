"use client";

import { Sparkles } from "lucide-react";

import {
  AssistantTextBubble,
  SystemBubble,
  ThinkingBlock,
  UserPromptBubble,
} from "@/components/chat/ChatBubbles";
import { AgentErrorBanner } from "@/components/chat/AgentErrorBanner";
import { AIAnswerCard } from "@/components/dashboard/AIAnswerCard";
import type { IssueId } from "@/components/dashboard/dashboard-demo-data";
import { useLocale } from "@/components/providers/LocaleProvider";
import {
  classifyAgentAnswer,
  type AgentFallbackKind,
} from "@/lib/ai/agent-fallback";
import type { AgentChatThreadMessage, DashboardIssueId } from "@/lib/ai/types";
import type { AISummary } from "@/types";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  fallbackKind?: AgentFallbackKind | null;
  isError?: boolean;
};

type ConversationThreadProps = {
  messages: ChatMessage[];
  activeIssueId: IssueId | null;
  isThinking: boolean;
  streamingMessageId?: string | null;
  patientId?: string;
  onOpenIssue: (issueId: IssueId) => void;
  onToggleIssue: (issueId: IssueId) => void;
  summary: AISummary | null;
  summaryIssueIds: DashboardIssueId[];
};

export function ConversationThread({
  messages,
  activeIssueId,
  isThinking,
  streamingMessageId = null,
  patientId,
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
  const showSummaryCard =
    summary && !classifyAgentAnswer(summary.answer);

  return (
    <div className="flex min-h-full flex-col gap-3 pb-3">
      {dedupedMessages.map((message) => {
        if (message.role === "user") {
          return <UserPromptBubble key={message.id} prompt={message.content} />;
        }

        if (message.role === "system") {
          return <SystemBubble key={message.id} content={message.content} />;
        }

        const isStreaming =
          streamingMessageId === message.id && Boolean(message.content);
        const isEmptyStreaming =
          streamingMessageId === message.id && !message.content;

        if (isEmptyStreaming || (!message.content && isThinking)) {
          return <ThinkingBlock key={message.id} label={thinkingLabel} />;
        }

        if (!message.content) {
          return null;
        }

        const fallbackKind =
          message.fallbackKind ??
          (message.isError ? "generic" : classifyAgentAnswer(message.content));

        if (fallbackKind && (message.isError || fallbackKind !== "generic")) {
          if (
            message.isError ||
            fallbackKind === "patient_not_found" ||
            fallbackKind === "safe_response"
          ) {
            return (
              <AgentErrorBanner
                key={message.id}
                kind={fallbackKind}
                locale={locale}
                patientId={patientId}
              />
            );
          }
        }

        if (message.isError) {
          return (
            <AgentErrorBanner
              key={message.id}
              kind={fallbackKind ?? "generic"}
              locale={locale}
              patientId={patientId}
            />
          );
        }

        return (
          <AssistantTextBubble
            key={message.id}
            content={message.content}
            isStreaming={isStreaming}
          />
        );
      })}

      {isThinking && !streamingMessageId ? (
        <ThinkingBlock label={thinkingLabel} />
      ) : null}

      {showSummaryCard ? (
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

export function toChatMessages(
  messages: AgentChatThreadMessage[],
): ChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    fallbackKind: message.fallbackKind,
    isError: message.isError,
  }));
}
