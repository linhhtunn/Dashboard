"use client";

import { Loader2, Send, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import {
  AssistantTextBubble,
  ThinkingBlock,
  UserPromptBubble,
} from "@/components/chat/ChatBubbles";
import { useLocale } from "@/components/providers/LocaleProvider";
import {
  fetchAgentAlertExplanation,
  streamAgentChat,
} from "@/lib/ai/chat-client";
import { createThreadId } from "@/lib/ai/thread-store";
import { getAlertTypeLabel } from "@/lib/i18n";
import type { Alert, Patient } from "@/types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type AlertAIChatPanelProps = {
  alert: Alert;
  patient?: Patient;
  onClose: () => void;
};

export function AlertAIChatPanel({
  alert,
  patient,
  onClose,
}: AlertAIChatPanelProps) {
  const { locale } = useLocale();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatting, setChatting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId] = useState(createThreadId);
  const messageCounter = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(
    () =>
      locale === "vi"
        ? [
            "Nguyên nhân có thể là gì?",
            "Cần can thiệp ngay không?",
            "So sánh với chỉ số gần nhất",
          ]
        : [
            "What could be causing this?",
            "Does this need immediate intervention?",
            "Compare with the latest vitals",
          ],
    [locale],
  );

  useEffect(() => {
    let cancelled = false;

    const loadExplanation = async () => {
      setLoading(true);
      setError(null);
      setMessages([]);
      try {
        const payload = await fetchAgentAlertExplanation({
          alertId: alert.id,
          patientId: alert.patientId,
          locale,
        });
        if (cancelled) return;
        setMessages([
          {
            id: "initial-explanation",
            role: "assistant",
            content: payload.summary.answer,
          },
        ]);
      } catch (nextError: unknown) {
        if (cancelled) return;
        setError(
          nextError instanceof Error
            ? nextError.message
            : locale === "vi"
              ? "Không thể tải giải thích cảnh báo."
              : "Unable to load alert explanation.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadExplanation();
    return () => {
      cancelled = true;
    };
  }, [alert.id, alert.patientId, locale]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading, chatting]);

  const submitQuestion = async (questionOverride?: string) => {
    const question = (questionOverride ?? draft).trim();
    if (!question || chatting || loading) return;

    messageCounter.current += 1;
    const messageId = messageCounter.current;
    const assistantId = `assistant-${messageId}`;
    const history = messages.map(({ role, content }) => ({ role, content }));

    setMessages((current) => [
      ...current,
      { id: `user-${messageId}`, role: "user", content: question },
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setDraft("");
    setChatting(true);
    setError(null);

    try {
      await streamAgentChat(
        {
          threadId,
          patientId: alert.patientId,
          locale,
          question,
          message: question,
          userId: "clinician-local",
          history,
        },
        {
          onDelta: ({ text }) => {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: `${message.content}${text}` }
                  : message,
              ),
            );
          },
        },
      );
    } catch (nextError: unknown) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : locale === "vi"
            ? "Không thể kết nối với AI."
            : "Unable to reach the AI service.";
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantId ? { ...item, content: message } : item,
        ),
      );
    } finally {
      setChatting(false);
    }
  };

  const thinkingLabel =
    locale === "vi" ? "Đang phân tích cảnh báo" : "Analyzing alert";

  return (
    <aside className="dashboard-surface flex h-full min-h-0 flex-col overflow-hidden rounded-[1.15rem]">
      <header className="flex shrink-0 items-start justify-between gap-2 border-b border-white/45 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.75rem] bg-[color:var(--cs-primary-soft)] text-[color:var(--cs-primary)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold text-[color:var(--cs-heading)]">
                {locale === "vi" ? "Giải thích cảnh báo" : "Alert explanation"}
              </h2>
              <p className="truncate text-[11px] text-[color:var(--cs-text-soft)]">
                {patient?.name ?? alert.patientId} ·{" "}
                {getAlertTypeLabel(alert.type, locale)}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="dashboard-input flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.65rem]"
          aria-label={locale === "vi" ? "Đóng panel AI" : "Close AI panel"}
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div
        ref={scrollRef}
        className="dashboard-scroll-area min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3"
      >
        {loading ? <ThinkingBlock label={thinkingLabel} size="compact" /> : null}

        {error && !loading ? (
          <p className="text-[12px] text-[color:var(--cs-danger)]">{error}</p>
        ) : null}

        {messages.map((message) =>
          message.role === "user" ? (
            <UserPromptBubble
              key={message.id}
              prompt={message.content}
              size="compact"
            />
          ) : message.content ? (
            <AssistantTextBubble
              key={message.id}
              content={message.content}
              size="compact"
            />
          ) : (
            <ThinkingBlock key={message.id} label={thinkingLabel} size="compact" />
          ),
        )}

        {chatting &&
        messages[messages.length - 1]?.role === "assistant" &&
        !messages[messages.length - 1]?.content ? null : null}
      </div>

      <footer className="shrink-0 border-t border-white/45 px-4 py-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={loading || chatting}
              onClick={() => void submitQuestion(suggestion)}
              className="rounded-full border border-[color:rgba(13,71,161,0.16)] bg-white/72 px-2.5 py-1 text-[10px] font-medium text-[color:var(--cs-primary)] disabled:opacity-45"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void submitQuestion();
          }}
          className="flex gap-2"
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={loading || chatting}
            placeholder={
              locale === "vi"
                ? "Hỏi thêm về cảnh báo này..."
                : "Ask more about this alert..."
            }
            className="dashboard-input h-10 min-w-0 flex-1 rounded-[0.7rem] px-3 text-[12px] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!draft.trim() || loading || chatting}
            className="flex h-10 w-10 items-center justify-center rounded-[0.7rem] bg-[color:var(--cs-primary)] text-white disabled:opacity-45"
            aria-label={locale === "vi" ? "Gửi câu hỏi" : "Send question"}
          >
            {chatting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>

        <p className="mt-2 text-[10px] text-[color:var(--cs-text-soft)]">
          {locale === "vi"
            ? "Chỉ hỗ trợ tham khảo, không thay thế chẩn đoán."
            : "AI support only. Not a diagnosis."}
        </p>
      </footer>
    </aside>
  );
}
