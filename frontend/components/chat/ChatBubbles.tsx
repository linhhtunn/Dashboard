"use client";

import { Sparkles } from "lucide-react";

import { MarkdownLite } from "@/components/common/MarkdownLite";

type BubbleSize = "default" | "compact";

function bubbleTextClass(size: BubbleSize) {
  return size === "compact"
    ? "text-[13px] leading-5"
    : "text-[15px] leading-6";
}

export function UserPromptBubble({
  prompt,
  size = "default",
}: {
  prompt: string;
  size?: BubbleSize;
}) {
  return (
    <div className="dashboard-fade-up flex justify-end">
      <div
        className={[
          "max-w-[80%] rounded-[0.9rem] rounded-br-md bg-[linear-gradient(135deg,rgba(13,71,161,0.09),rgba(142,211,230,0.12))] px-3.5 py-2.5 font-medium text-[color:var(--cs-heading)]",
          bubbleTextClass(size),
        ].join(" ")}
      >
        {prompt}
      </div>
    </div>
  );
}

export function AssistantTextBubble({
  content,
  size = "default",
  isStreaming = false,
}: {
  content: string;
  size?: BubbleSize;
  isStreaming?: boolean;
}) {
  return (
    <div className="dashboard-fade-up flex gap-2.5">
      <div className="hidden pt-1 sm:block">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:rgba(13,71,161,0.08)] text-[color:var(--cs-primary)]">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      <div
        className={[
          "max-w-[86%] rounded-[0.9rem] bg-white/34 px-3.5 py-2.5 backdrop-blur-[8px] text-[color:var(--cs-text)]",
          size === "compact" ? "space-y-1.5" : "space-y-2",
        ].join(" ")}
      >
        <MarkdownLite
          content={content}
          density={size === "compact" ? "compact" : "default"}
          className={["space-y-1.5", bubbleTextClass(size)].join(" ")}
        />
        {isStreaming ? (
          <span
            className="ml-0.5 inline-block h-3 w-0.5 animate-pulse rounded-full bg-[color:var(--cs-primary)]"
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
}

export function SystemBubble({
  content,
  size = "default",
}: {
  content: string;
  size?: BubbleSize;
}) {
  return (
    <div className="dashboard-fade-up flex">
      <div
        className={[
          "rounded-[0.9rem] border border-[color:rgba(13,71,161,0.12)] bg-white/42 px-3.5 py-2.5 text-[color:var(--cs-text-soft)] backdrop-blur-[8px]",
          size === "compact" ? "text-[13px] leading-5" : "text-[14px] leading-6",
        ].join(" ")}
      >
        {content}
      </div>
    </div>
  );
}

export function ThinkingBlock({
  label,
  size = "default",
}: {
  label: string;
  size?: BubbleSize;
}) {
  return (
    <div className="dashboard-fade-up flex gap-2.5">
      <div className="hidden pt-1 sm:block">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:rgba(13,71,161,0.08)] text-[color:var(--cs-primary)]">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      <div className="dashboard-thinking rounded-[1rem] bg-white/45 px-3.5 py-2.5 backdrop-blur-[10px]">
        <div
          className={[
            "flex items-center gap-2.5 text-[color:var(--cs-text)]",
            bubbleTextClass(size),
          ].join(" ")}
        >
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
