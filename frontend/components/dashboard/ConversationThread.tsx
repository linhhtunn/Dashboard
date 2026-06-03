"use client";

import { Sparkles } from "lucide-react";

import { AIAnswerCard } from "@/components/dashboard/AIAnswerCard";
import {
  dashboardSummary,
  type IssueId,
} from "@/components/dashboard/dashboard-demo-data";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ConversationThreadProps = {
  messages: ChatMessage[];
  activeIssueId: IssueId | null;
  isThinking: boolean;
  onOpenIssue: (issueId: IssueId) => void;
  onToggleIssue: (issueId: IssueId) => void;
};

function UserPromptBubble({ prompt }: { prompt: string }) {
  return (
    <div className="dashboard-fade-up flex justify-end">
      <div className="max-w-[78%] rounded-[1rem] rounded-br-md bg-[linear-gradient(135deg,rgba(13,71,161,0.09),rgba(142,211,230,0.12))] px-3.5 py-2.5 text-sm font-medium leading-6 text-[color:var(--cs-heading)]">
        {prompt}
      </div>
    </div>
  );
}

function AssistantTextBubble({ content }: { content: string }) {
  return (
    <div className="dashboard-fade-up flex gap-3">
      <div className="hidden pt-1 sm:block">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[color:rgba(13,71,161,0.08)] text-[color:var(--cs-primary)]">
          <Sparkles className="h-4.5 w-4.5" />
        </div>
      </div>

      <div className="max-w-[84%] rounded-[1rem] bg-white/34 px-3.5 py-2.5 text-sm leading-6 text-[color:var(--cs-text)] backdrop-blur-[8px]">
        {content}
      </div>
    </div>
  );
}

function ThinkingBlock() {
  return (
    <div className="dashboard-fade-up flex gap-3">
      <div className="hidden pt-1 sm:block">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[color:rgba(13,71,161,0.08)] text-[color:var(--cs-primary)]">
          <Sparkles className="h-4.5 w-4.5" />
        </div>
      </div>

      <div className="dashboard-thinking rounded-[1.15rem] bg-white/45 px-4 py-3 backdrop-blur-[10px]">
        <div className="flex items-center gap-3 text-sm text-[color:var(--cs-text)]">
          <span>Đang tổng hợp diễn biến</span>
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
}: ConversationThreadProps) {
  return (
    <div className="flex min-h-full flex-col gap-4 pb-4">
      {messages.map((message) =>
        message.role === "user" ? (
          <UserPromptBubble key={message.id} prompt={message.content} />
        ) : (
          <AssistantTextBubble key={message.id} content={message.content} />
        ),
      )}

      {isThinking ? (
        <ThinkingBlock />
      ) : messages.length > 0 ? (
        <div className="dashboard-fade-up flex gap-3">
          <div className="hidden pt-1 sm:block">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[color:rgba(13,71,161,0.08)] text-[color:var(--cs-primary)]">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <AIAnswerCard
              summary={dashboardSummary}
              activeIssueId={activeIssueId}
              onOpenIssue={onOpenIssue}
              onToggleIssue={onToggleIssue}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
