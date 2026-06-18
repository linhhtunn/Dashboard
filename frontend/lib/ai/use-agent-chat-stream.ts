"use client";

import { useCallback, useRef, useState } from "react";

import {
  classifyAgentAnswer,
  classifyAgentError,
  type AgentFallbackKind,
} from "@/lib/ai/agent-fallback";
import { streamAgentChat } from "@/lib/ai/chat-client";
import type {
  AgentChatProxyRequest,
  AgentChatThreadMessage,
  AgentInsightPayload,
} from "@/lib/ai/types";
import type { Locale } from "@/types";

type UseAgentChatStreamOptions = {
  threadId: string;
  patientId?: string;
  locale: Locale;
  userId?: string;
  metadata?: AgentChatProxyRequest["metadata"];
  onComplete?: (payload: AgentInsightPayload) => void;
};

export function useAgentChatStream({
  threadId,
  patientId,
  locale,
  userId = "clinician-local",
  metadata,
  onComplete,
}: UseAgentChatStreamOptions) {
  const [messages, setMessages] = useState<AgentChatThreadMessage[]>([]);
  const [chatting, setChatting] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const messageCounter = useRef(0);

  const submitQuestion = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || chatting) return;

      messageCounter.current += 1;
      const messageId = messageCounter.current;
      const userMessageId = `user-${messageId}`;
      const assistantId = `assistant-${messageId}`;
      const history = messages
        .filter((message) => message.content && !message.isError)
        .map(({ role, content }) => ({ role, content }));

      setMessages((current) => [
        ...current,
        { id: userMessageId, role: "user", content: trimmed },
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setChatting(true);
      setStreamingMessageId(assistantId);
      setError(null);

      try {
        let hasStreamed = false;
        await streamAgentChat(
          {
            threadId,
            patientId,
            locale,
            question: trimmed,
            message: trimmed,
            userId,
            metadata,
            history,
          },
          {
            onDelta: ({ text }) => {
              hasStreamed = true;
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantId
                    ? { ...message, content: `${message.content}${text}` }
                    : message,
                ),
              );
            },
            onComplete: ({ payload }) => {
              const answer = payload.summary.answer;
              const fallbackKind = classifyAgentAnswer(answer);
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantId
                    ? { ...message, content: answer, payload, fallbackKind }
                    : message,
                ),
              );
              onComplete?.(payload);
            },
          },
        );

        if (!hasStreamed) {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId && !message.content
                ? {
                    ...message,
                    content:
                      locale === "vi"
                        ? "Agent không trả về nội dung."
                        : "Agent returned no content.",
                    isError: true,
                  }
                : message,
            ),
          );
        }
      } catch (nextError: unknown) {
        const raw =
          nextError instanceof Error
            ? nextError.message
            : locale === "vi"
              ? "Không thể kết nối với AI."
              : "Unable to reach the AI service.";
        const kind = classifyAgentError(raw);
        setError(raw);
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? {
                  ...item,
                  content: "",
                  isError: true,
                  fallbackKind: kind,
                }
              : item,
          ),
        );
      } finally {
        setChatting(false);
        setStreamingMessageId(null);
      }
    },
    [chatting, locale, messages, metadata, onComplete, patientId, threadId, userId],
  );

  const setAssistantMessage = useCallback(
    (id: string, content: string, fallbackKind?: AgentFallbackKind | null) => {
      setMessages([{ id, role: "assistant", content, fallbackKind }]);
    },
    [],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const prependMessages = useCallback((items: AgentChatThreadMessage[]) => {
    setMessages((current) => [...items, ...current]);
  }, []);

  return {
    messages,
    setMessages,
    chatting,
    streamingMessageId,
    error,
    submitQuestion,
    setAssistantMessage,
    prependMessages,
    clearMessages,
  };
}
