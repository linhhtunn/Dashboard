"use client";

import { Sparkles } from "lucide-react";

import { MarkdownLite } from "@/components/common/MarkdownLite";
import { AIAnswerCard } from "@/components/dashboard/AIAnswerCard";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { AISummary } from "@/types";
import type { DashboardIssueId } from "@/lib/ai/types";
import type { IssueId } from "@/components/dashboard/dashboard-demo-data";

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

function UserPromptBubble({ prompt }: { prompt: string }) {
  return (
    <div className="dashboard-fade-up flex justify-end">
      <div className="max-w-[80%] rounded-[0.9rem] rounded-br-md bg-[linear-gradient(135deg,rgba(13,71,161,0.09),rgba(142,211,230,0.12))] px-3.5 py-2.5 text-[15px] font-medium leading-6 text-[color:var(--cs-heading)]">
        {prompt}
      </div>
    </div>
  );
}

function AssistantTextBubble({ content }: { content: string }) {
  return (
    <div className="dashboard-fade-up flex gap-2.5">
      <div className="hidden pt-1 sm:block">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:rgba(13,71,161,0.08)] text-[color:var(--cs-primary)]">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      <div className="max-w-[86%] rounded-[0.9rem] bg-white/34 px-3.5 py-2.5 backdrop-blur-[8px]">
        <MarkdownLite
          content={content}
          className="space-y-2 text-[15px] leading-6 text-[color:var(--cs-text)]"
        />
      </div>
    </div>
  );
}

function SystemBubble({ content }: { content: string }) {
  return (
    <div className="dashboard-fade-up flex">
      <div className="rounded-[0.9rem] border border-[color:rgba(13,71,161,0.12)] bg-white/42 px-3.5 py-2.5 text-[14px] leading-6 text-[color:var(--cs-text-soft)] backdrop-blur-[8px]">
        {content}
      </div>
    </div>
  );
}

function ThinkingBlock({ label }: { label: string }) {
  return (
    <div className="dashboard-fade-up flex gap-2.5">
      <div className="hidden pt-1 sm:block">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:rgba(13,71,161,0.08)] text-[color:var(--cs-primary)]">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      <div className="dashboard-thinking rounded-[1rem] bg-white/45 px-3.5 py-2.5 backdrop-blur-[10px]">
        <div className="flex items-center gap-2.5 text-[15px] text-[color:var(--cs-text)]">
          <span>{label}</span>
          <span className="dashboard-thinking-dots">
            <span />
            <span />
            <span />
          </span>
        </div>
      </div>
    </div>
  );
}

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
      ? "Đang tổng hợp diễn biến từ backend AI"
      : "Summarizing changes from the AI backend";

  return (
    <div className="flex min-h-full flex-col gap-3 pb-3">
      {messages.map((message) => {
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
