"use client";

import { Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { AgentChatThread } from "@/components/chat/AgentChatThread";
import { AgentErrorBanner } from "@/components/chat/AgentErrorBanner";
import { useLocale } from "@/components/providers/LocaleProvider";
import { classifyAgentError } from "@/lib/ai/agent-fallback";
import { useAgentChatStream } from "@/lib/ai/use-agent-chat-stream";
import { createThreadId } from "@/lib/ai/thread-store";
import type { PatientListItem } from "@/components/patients";

type PatientsBubbleChatProps = {
  items: PatientListItem[];
};

export function PatientsBubbleChat(_props: PatientsBubbleChatProps) {
  void _props;
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [threadId] = useState(createThreadId);

  const {
    messages,
    chatting,
    streamingMessageId,
    error,
    submitQuestion,
  } = useAgentChatStream({
    threadId,
    locale,
    metadata: { source_view: "overview" },
  });

  const suggestions = useMemo(
    () =>
      locale === "vi"
        ? [
            "Ai cần ưu tiên nhất hôm nay?",
            "Tóm tắt tình hình ca trực",
            "Có bệnh nhân nào cần can thiệp ngay?",
          ]
        : [
            "Who needs priority today?",
            "Summarize the shift overview",
            "Does any patient need immediate intervention?",
          ],
    [locale],
  );

  const thinkingLabel =
    locale === "vi" ? "Đang tổng hợp ca trực" : "Summarizing the shift";

  const handleSubmit = async (questionOverride?: string) => {
    const question = (questionOverride ?? draft).trim();
    if (!question || chatting) return;
    setDraft("");
    await submitQuestion(question);
  };

  return (
    <>
      {open ? (
        <div className="fixed bottom-4 right-4 z-50 flex h-[min(520px,calc(100dvh-6rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[1.15rem] border border-white/60 bg-[color:rgba(255,255,255,0.92)] shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-[16px]">
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-[0.75rem] bg-[color:var(--cs-primary-soft)] text-[color:var(--cs-primary)]">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[14px] font-semibold text-[color:var(--cs-heading)]">
                  {locale === "vi" ? "Trợ lý ca trực" : "Shift assistant"}
                </h2>
                <p className="text-[10px] text-[color:var(--cs-text-soft)]">
                  {locale === "vi"
                    ? "Hỏi về ưu tiên và tình hình bệnh nhân"
                    : "Ask about priorities and patient status"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="dashboard-input flex h-8 w-8 items-center justify-center rounded-[0.65rem]"
              aria-label={locale === "vi" ? "Đóng chat" : "Close chat"}
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
            {!messages.length && !chatting ? (
              <p className="mb-3 text-center text-[12px] leading-5 text-[color:var(--cs-text-soft)]">
                {locale === "vi"
                  ? "Chọn gợi ý bên dưới hoặc nhập câu hỏi về ca trực."
                  : "Pick a suggestion below or ask about the shift."}
              </p>
            ) : null}

            {error && !messages.some((m) => m.isError) ? (
              <AgentErrorBanner
                kind={classifyAgentError(error)}
                locale={locale}
                className="mb-3"
              />
            ) : null}

            <AgentChatThread
              messages={messages}
              locale={locale}
              thinkingLabel={thinkingLabel}
              streamingMessageId={streamingMessageId}
              size="compact"
              className="min-h-0 flex-1 pr-1"
            />
          </div>

          <footer className="shrink-0 border-t border-white/50 px-4 py-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={chatting}
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
                disabled={chatting}
                placeholder={
                  locale === "vi" ? "Hỏi về ca trực..." : "Ask about the shift..."
                }
                className="dashboard-input h-10 min-w-0 flex-1 rounded-[0.7rem] px-3 text-[12px] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!draft.trim() || chatting}
                className="flex h-10 w-10 items-center justify-center rounded-[0.7rem] bg-[color:var(--cs-primary)] text-white disabled:opacity-45"
                aria-label={locale === "vi" ? "Gửi" : "Send"}
              >
                {chatting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </footer>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={[
          "fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--cs-primary),var(--cs-teal))] text-white shadow-[0_18px_40px_rgba(13,71,161,0.28)] transition hover:scale-105",
          open ? "pointer-events-none opacity-0" : "opacity-100",
        ].join(" ")}
        aria-label={locale === "vi" ? "Mở chat AI" : "Open AI chat"}
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </>
  );
}
