"use client";

import { Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import {
  AssistantTextBubble,
  ThinkingBlock,
  UserPromptBubble,
} from "@/components/chat/ChatBubbles";
import { useLocale } from "@/components/providers/LocaleProvider";
import { streamAgentChat } from "@/lib/ai/chat-client";
import { createThreadId } from "@/lib/ai/thread-store";
import type { PatientListItem } from "@/components/patients";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type PatientsBubbleChatProps = {
  items: PatientListItem[];
};

export function PatientsBubbleChat({ items }: PatientsBubbleChatProps) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [chatting, setChatting] = useState(false);
  const [threadId] = useState(createThreadId);
  const messageCounter = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const contextPatientId = useMemo(() => {
    const priority =
      items.find(
        (item) =>
          item.patient.status === "critical" || item.openAlertCount > 0,
      ) ?? items[0];
    return priority?.patient.id ?? "P001";
  }, [items]);

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

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open, chatting]);

  const submitQuestion = async (questionOverride?: string) => {
    const question = (questionOverride ?? draft).trim();
    if (!question || chatting) return;

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

    try {
      await streamAgentChat(
        {
          threadId,
          patientId: contextPatientId,
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
    locale === "vi" ? "Đang tổng hợp ca trực" : "Summarizing the shift";

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

          <div
            ref={scrollRef}
            className="dashboard-scroll-area min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3"
          >
            {!messages.length && !chatting ? (
              <p className="text-center text-[12px] leading-5 text-[color:var(--cs-text-soft)]">
                {locale === "vi"
                  ? "Chọn gợi ý bên dưới hoặc nhập câu hỏi về ca trực."
                  : "Pick a suggestion below or ask about the shift."}
              </p>
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
                <ThinkingBlock
                  key={message.id}
                  label={thinkingLabel}
                  size="compact"
                />
              ),
            )}
          </div>

          <footer className="shrink-0 border-t border-white/50 px-4 py-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={chatting}
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
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            setOpen(true);
          }
        }}
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
