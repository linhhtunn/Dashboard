"use client";

import {
  Download,
  FileText,
  Loader2,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";

import { MarkdownLite } from "@/components/common/MarkdownLite";
import { useLocale } from "@/components/providers/LocaleProvider";
import { fetchAgentSummary, streamAgentChat } from "@/lib/ai/chat-client";
import type { AgentInsightPayload } from "@/lib/ai/types";
import { createThreadId } from "@/lib/ai/thread-store";
import type { Patient } from "@/types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function PatientAIChatPanel({
  patient,
  compact = false,
}: {
  patient: Patient;
  compact?: boolean;
}) {
  const { locale } = useLocale();
  const [payload, setPayload] = useState<AgentInsightPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [chatting, setChatting] = useState(false);
  const [threadId] = useState(createThreadId);
  const [exportOpen, setExportOpen] = useState(false);
  const messageCounter = useRef(0);

  const suggestions = useMemo(
    () =>
      locale === "vi"
        ? [
            "Nhịp thở có liên quan gì đến oxy máu?",
            "So sánh các chỉ số với hôm qua",
            "Chỉ số nào cần ưu tiên theo dõi?",
          ]
        : [
            "How is respiratory rate related to SpO₂?",
            "Compare the metrics with yesterday",
            "Which metric needs priority monitoring?",
          ],
    [locale],
  );

  const requestSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      setPayload(await fetchAgentSummary({ patientId: patient.id, locale }));
    } catch (nextError: unknown) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : locale === "vi"
            ? "Không thể tải tóm tắt AI."
            : "Unable to load the AI summary.",
      );
    } finally {
      setLoading(false);
    }
  };

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
    setError(null);

    try {
      await streamAgentChat(
        {
          threadId,
          patientId: patient.id,
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
          onComplete: ({ payload: nextPayload }) => {
            setPayload(nextPayload);
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

  return (
    <>
      <aside
        className={[
          "dashboard-surface overflow-hidden rounded-[1.15rem]",
          compact ? "flex h-full min-h-0 flex-col" : "xl:sticky xl:top-3",
        ].join(" ")}
      >
        <div className={`shrink-0 border-b border-[color:var(--cs-border)] px-4 ${compact ? "py-2" : "py-3"}`}>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[0.75rem] bg-[color:var(--cs-primary-soft)] text-[color:var(--cs-primary)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[14px] font-semibold text-[color:var(--cs-heading)]">
                {locale === "vi" ? "Trợ lý AI lâm sàng" : "Clinical AI assistant"}
              </h2>
              <p className="text-[10px] text-[color:var(--cs-text-soft)]">
                {locale === "vi"
                  ? "Chỉ hỗ trợ tham khảo, không thay thế chẩn đoán."
                  : "AI support only. Not a diagnosis."}
              </p>
            </div>
          </div>
        </div>

        <div
          className={[
            "dashboard-scroll-area overflow-y-auto p-4",
            compact
              ? "min-h-0 flex-1"
              : "max-h-[calc(100dvh-210px)] min-h-[430px]",
          ].join(" ")}
        >
          {!payload && !loading ? (
            <div className={`flex flex-col items-center justify-center text-center ${compact ? "min-h-full" : "min-h-[380px]"}`}>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--cs-primary-soft)] text-[color:var(--cs-primary)]">
                <Sparkles className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-[15px] font-semibold text-[color:var(--cs-heading)]">
                {locale === "vi" ? "Bắt đầu khi bác sĩ cần" : "Start when the clinician is ready"}
              </h3>
              <p className="mt-1 max-w-[280px] text-[12px] leading-5 text-[color:var(--cs-text-soft)]">
                {locale === "vi"
                  ? "AI sẽ tổng hợp chỉ số sinh tồn 24 giờ, mức cơ sở và lịch sử cảnh báo của bệnh nhân."
                  : "AI will summarize 24-hour vitals, baseline, and alert history."}
              </p>
              <button
                type="button"
                onClick={() => void requestSummary()}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-[0.7rem] bg-[color:var(--cs-primary)] px-4 text-[12px] font-semibold text-white shadow-[0_10px_24px_rgba(13,71,161,0.2)]"
              >
                <Sparkles className="h-4 w-4" />
                {locale === "vi" ? "Tóm tắt tình trạng" : "Summarize condition"}
              </button>
              {error ? <p className="mt-3 text-[11px] text-[color:var(--cs-danger)]">{error}</p> : null}
            </div>
          ) : null}

          {loading ? <SummarySkeleton locale={locale} /> : null}

          {payload && !loading ? (
            <div className="space-y-3">
              <section className="rounded-[0.9rem] border border-[color:rgba(13,71,161,0.12)] bg-white/68 px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--cs-teal)]">
                  {locale === "vi" ? "Tình trạng hiện tại" : "Current condition"}
                </p>
                <MarkdownLite
                  content={payload.summary.answer}
                  className="mt-2 space-y-2 text-[12px] leading-5 text-[color:var(--cs-text)]"
                />
              </section>

              {payload.summary.keyFindings.length ? (
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--cs-text-soft)]">
                    {locale === "vi" ? "So với mức cơ sở" : "Compared with baseline"}
                  </p>
                  <div className="mt-1.5 space-y-1.5">
                    {payload.summary.keyFindings.slice(0, 4).map((finding) => (
                      <p
                        key={finding}
                        className="rounded-[0.7rem] bg-white/64 px-3 py-2 text-[11px] leading-4 text-[color:var(--cs-text)]"
                      >
                        {finding}
                      </p>
                    ))}
                  </div>
                </section>
              ) : null}

              {messages.length ? (
                <section className="space-y-2 border-t border-[color:var(--cs-border)] pt-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={[
                        "rounded-[0.8rem] px-3 py-2.5 text-[12px] leading-5",
                        message.role === "user"
                          ? "ml-8 bg-[color:var(--cs-primary-soft)] text-[color:var(--cs-heading)]"
                          : "mr-4 bg-white/72 text-[color:var(--cs-text)]",
                      ].join(" ")}
                    >
                      {message.content || (
                        <span className="inline-flex items-center gap-2 text-[color:var(--cs-text-soft)]">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {locale === "vi" ? "Đang phân tích..." : "Analyzing..."}
                        </span>
                      )}
                    </div>
                  ))}
                </section>
              ) : null}

              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void submitQuestion(suggestion)}
                    className="rounded-full border border-[color:rgba(13,71,161,0.16)] bg-white/72 px-2.5 py-1.5 text-left text-[10px] font-medium text-[color:var(--cs-primary)]"
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
                  placeholder={locale === "vi" ? "Hỏi thêm về bệnh nhân..." : "Ask about this patient..."}
                  className="dashboard-input h-10 min-w-0 flex-1 rounded-[0.7rem] px-3 text-[12px]"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || chatting}
                  className="flex h-10 w-10 items-center justify-center rounded-[0.7rem] bg-[color:var(--cs-primary)] text-white disabled:opacity-45"
                  aria-label={locale === "vi" ? "Gửi câu hỏi" : "Send question"}
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>

              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[0.7rem] border border-[color:var(--cs-teal)] bg-white text-[12px] font-semibold text-[color:var(--cs-teal)]"
              >
                <FileText className="h-4 w-4" />
                {locale === "vi" ? "Xuất tờ điều trị" : "Export treatment note"}
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      {exportOpen ? (
        <TreatmentNoteModal
          patient={patient}
          summary={payload?.summary.answer ?? ""}
          onClose={() => setExportOpen(false)}
        />
      ) : null}
    </>
  );
}

function SummarySkeleton({ locale }: { locale: "vi" | "en" }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[12px] text-[color:var(--cs-text-soft)]">
        <Loader2 className="h-4 w-4 animate-spin text-[color:var(--cs-primary)]" />
        {locale === "vi" ? "Đang truy vấn chỉ số sinh tồn 24 giờ và mức cơ sở..." : "Querying 24-hour vitals and baseline..."}
      </div>
      {[96, 72, 84, 60].map((width) => (
        <div
          key={width}
          className="h-3 animate-pulse rounded-full bg-[color:rgba(13,71,161,0.08)]"
          style={{ width: `${width}%` }}
        />
      ))}
    </div>
  );
}

function TreatmentNoteModal({
  patient,
  summary,
  onClose,
}: {
  patient: Patient;
  summary: string;
  onClose: () => void;
}) {
  const { locale } = useLocale();
  const [content, setContent] = useState(
    `${locale === "vi" ? "TỜ ĐIỀU TRỊ" : "TREATMENT NOTE"}\n\n` +
      `${locale === "vi" ? "Bệnh nhân" : "Patient"}: ${patient.name}\n${locale === "vi" ? "Mã hồ sơ" : "MRN"}: ${patient.mrn}\n\n` +
      `${summary}\n\n${locale === "vi" ? "Chỉ hỗ trợ tham khảo, không thay thế chẩn đoán. Luôn dùng phán đoán lâm sàng." : "AI support only. Not a diagnosis. Always use clinical judgment."}`,
  );

  const download = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `treatment-note-${patient.id}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute inset-0 z-[90] flex items-center justify-center bg-[color:rgba(15,23,42,0.34)] p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[1.2rem] bg-white p-4 shadow-[0_30px_90px_rgba(15,23,42,0.25)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[1rem] font-semibold text-[color:var(--cs-heading)]">
              {locale === "vi" ? "Xem trước tờ điều trị" : "Treatment note preview"}
            </h2>
            <p className="text-[11px] text-[color:var(--cs-text-soft)]">
              {locale === "vi" ? "Có thể chỉnh sửa trước khi xuất." : "Edit before exporting."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--cs-primary-soft)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="dashboard-input mt-4 min-h-[320px] w-full rounded-[0.8rem] p-3 text-[12px] leading-5"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-[0.7rem] border border-[color:var(--cs-border)] px-4 text-[12px] font-semibold">
            {locale === "vi" ? "Hủy" : "Cancel"}
          </button>
          <button type="button" onClick={download} className="inline-flex h-10 items-center gap-2 rounded-[0.7rem] bg-[color:var(--cs-primary)] px-4 text-[12px] font-semibold text-white">
            <Download className="h-4 w-4" />
            {locale === "vi" ? "Xuất tệp văn bản" : "Export text"}
          </button>
        </div>
      </div>
    </div>
  );
}
