"use client";

import { useEffect, useRef } from "react";

import {
  AssistantTextBubble,
  ThinkingBlock,
  UserPromptBubble,
} from "@/components/chat/ChatBubbles";
import { AgentErrorBanner } from "@/components/chat/AgentErrorBanner";
import {
  classifyAgentAnswer,
  type AgentFallbackKind,
} from "@/lib/ai/agent-fallback";
import type { AgentChatThreadMessage } from "@/lib/ai/types";
import type { Locale } from "@/types";

type AgentChatThreadProps = {
  messages: AgentChatThreadMessage[];
  locale: Locale;
  patientId?: string;
  thinkingLabel: string;
  streamingMessageId?: string | null;
  size?: "default" | "compact";
  emptyState?: React.ReactNode;
  className?: string;
};

export function AgentChatThread({
  messages,
  locale,
  patientId,
  thinkingLabel,
  streamingMessageId = null,
  size = "compact",
  emptyState,
  className = "",
}: AgentChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamingMessageId]);

  return (
    <div
      ref={scrollRef}
      className={["dashboard-scroll-area space-y-3 overflow-y-auto", className].join(
        " ",
      )}
    >
      {emptyState && messages.length === 0 ? emptyState : null}

      {messages.map((message) => {
        if (message.role === "user") {
          return (
            <UserPromptBubble
              key={message.id}
              prompt={message.content}
              size={size}
            />
          );
        }

        const isStreaming = streamingMessageId === message.id && !message.content;
        if (isStreaming) {
          return (
            <ThinkingBlock key={message.id} label={thinkingLabel} size={size} />
          );
        }

        if (!message.content) {
          return (
            <ThinkingBlock key={message.id} label={thinkingLabel} size={size} />
          );
        }

        const fallbackKind =
          message.fallbackKind ??
          (message.isError
            ? "generic"
            : classifyAgentAnswer(message.content));

        if (fallbackKind && !message.isError) {
          if (
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
            size={size}
            isStreaming={streamingMessageId === message.id}
          />
        );
      })}
    </div>
  );
}
