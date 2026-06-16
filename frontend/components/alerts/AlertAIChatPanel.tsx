"use client";

import { Loader2, Send, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { AgentChatThread } from "@/components/chat/AgentChatThread";
import { AgentErrorBanner } from "@/components/chat/AgentErrorBanner";
import { useLocale } from "@/components/providers/LocaleProvider";
import {
  classifyAgentAnswer,
  classifyAgentError,
} from "@/lib/ai/agent-fallback";
import { fetchAgentAlertExplanation } from "@/lib/ai/chat-client";
import { useAgentChatStream } from "@/lib/ai/use-agent-chat-stream";
import { createThreadId } from "@/lib/ai/thread-store";
import { getAlertTypeLabel } from "@/lib/i18n";
import type { Alert, Patient } from "@/types";

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
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [threadId] = useState(createThreadId);

  const {
    messages,
    chatting,
    streamingMessageId,
    error,
    submitQuestion,
    setAssistantMessage,
    clearMessages,
  } = useAgentChatStream({
    threadId,
    patientId: alert.patientId,
    locale,
    metadata: { alert_id: alert.id },
  });

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
      setLoadError(null);
      clearMessages();
      try {
        const payload = await fetchAgentAlertExplanation({
          alertId: alert.id,
          patientId: alert.patientId,
          locale,
        });
        if (cancelled) return;
        setAssistantMessage(
          "initial-explanation",
          payload.summary.answer,
          classifyAgentAnswer(payload.summary.answer),
        );
      } catch (nextError: unknown) {
        if (cancelled) return;
        setLoadError(
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
  }, [
    alert.id,
    alert.patientId,
    clearMessages,
    locale,
    setAssistantMessage,
  ]);

  const thinkingLabel =
    locale === "vi" ? "Đang phân tích cảnh báo" : "Analyzing alert";

  const handleSubmit = async (questionOverride?: string) => {
    const question = (questionOverride ?? draft).trim();
    if (!question || chatting || loading) return;
    setDraft("");
    await submitQuestion(question);
  };

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

      <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-[12px] text-[color:var(--cs-text-soft)]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-[color:var(--cs-primary)]" />
            {thinkingLabel}...
          </div>
        ) : (
          <>
            {loadError ? (
              <AgentErrorBanner
                kind={classifyAgentError(loadError)}
                locale={locale}
                patientId={alert.patientId}
                className="mb-3"
              />
            ) : null}

            {error && !messages.some((m) => m.isError) ? (
              <AgentErrorBanner
                kind={classifyAgentError(error)}
                locale={locale}
                patientId={alert.patientId}
                className="mb-3"
              />
            ) : null}

            <AgentChatThread
              messages={messages}
              locale={locale}
              patientId={alert.patientId}
              thinkingLabel={thinkingLabel}
              streamingMessageId={streamingMessageId}
              size="compact"
              className="min-h-0 flex-1 pr-1"
            />
          </>
        )}
      </div>

      <footer className="shrink-0 border-t border-white/45 px-4 py-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={loading || chatting}
              onClick={() => void handleSubmit(suggestion)}
              className="rounded-full border border-[color:rgba(13,71,161,0.16)] bg-white/72 px-2.5 py-1 text-[10px] font-medium text-[color:var(--cs-primary)] disabled:opacity-45"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void handleSubmit();
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
