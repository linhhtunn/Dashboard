"use client";

import {
  Download,
  FileText,
  Loader2,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { AgentChatThread } from "@/components/chat/AgentChatThread";
import { AgentErrorBanner } from "@/components/chat/AgentErrorBanner";
import { useLocale } from "@/components/providers/LocaleProvider";
import { buildSummaryPrompt } from "@/lib/ai/agent-chat-request";
import {
  classifyAgentAnswer,
  classifyAgentError,
} from "@/lib/ai/agent-fallback";
import type { AgentInsightPayload } from "@/lib/ai/types";
import { useAgentChatStream } from "@/lib/ai/use-agent-chat-stream";
import { createThreadId } from "@/lib/ai/thread-store";
import type { Patient } from "@/types";

export function PatientAIChatPanel({
  patient,
  compact = false,
}: {
  patient: Patient;
  compact?: boolean;
}) {
  const { locale } = useLocale();
  const [payload, setPayload] = useState<AgentInsightPayload | null>(null);
  const [draft, setDraft] = useState("");
  const [threadId] = useState(createThreadId);
  const [exportOpen, setExportOpen] = useState(false);

  const {
    messages,
    chatting,
    streamingMessageId,
    error,
    submitQuestion,
  } = useAgentChatStream({
    threadId,
    patientId: patient.id,
    locale,
    onComplete: (nextPayload) => setPayload(nextPayload),
  });

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

  const hasStarted = messages.length > 0;
  const thinkingLabel =
    locale === "vi" ? "Đang phân tích bệnh nhân" : "Analyzing patient";

  const handleSubmit = async (questionOverride?: string) => {
    const question = (questionOverride ?? draft).trim();
    if (!question || chatting) return;
    setDraft("");
    await submitQuestion(question);
  };

  const exportSummary =
    payload?.summary.answer ??
    [...messages].reverse().find((m) => m.role === "assistant" && m.content)
      ?.content ??
    "";

  return (
    <>
      <aside
        className={[
          "dashboard-surface overflow-hidden rounded-[1.15rem]",
          compact ? "flex h-full min-h-0 flex-col" : "xl:sticky xl:top-3",
        ].join(" ")}
      >
        <div
          className={`shrink-0 border-b border-[color:var(--cs-border)] px-4 ${compact ? "py-2" : "py-3"}`}
        >
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
            "flex min-h-0 flex-1 flex-col p-4",
            compact ? "" : "max-h-[calc(100dvh-210px)] min-h-[430px]",
          ].join(" ")}
        >
          {!hasStarted && !chatting ? (
            <div
              className={`flex flex-1 flex-col items-center justify-center text-center ${compact ? "" : "min-h-[280px]"}`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--cs-primary-soft)] text-[color:var(--cs-primary)]">
                <Sparkles className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-[15px] font-semibold text-[color:var(--cs-heading)]">
                {locale === "vi" ? "Bắt đầu khi bác sĩ cần" : "Start when the clinician is ready"}
              </h3>
              <p className="mt-1 max-w-[280px] text-[12px] leading-5 text-[color:var(--cs-text-soft)]">
                {locale === "vi"
                  ? "AI tổng hợp hồ sơ qua agent backend. Dùng MIMIC ID (vd. 10003400) khi test HF."
                  : "AI summarizes via the agent backend. Use a MIMIC ID (e.g. 10003400) on HF."}
              </p>
              <button
                type="button"
                onClick={() => void submitQuestion(buildSummaryPrompt(locale))}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-[0.7rem] bg-[color:var(--cs-primary)] px-4 text-[12px] font-semibold text-white shadow-[0_10px_24px_rgba(13,71,161,0.2)]"
              >
                <Sparkles className="h-4 w-4" />
                {locale === "vi" ? "Tóm tắt tình trạng" : "Summarize condition"}
              </button>
            </div>
          ) : null}

          {error && !messages.some((m) => m.isError) ? (
            <AgentErrorBanner
              kind={classifyAgentError(error)}
              locale={locale}
              patientId={patient.id}
              className="mb-3"
            />
          ) : null}

          {hasStarted ? (
            <>
              <AgentChatThread
                messages={messages}
                locale={locale}
                patientId={patient.id}
                thinkingLabel={thinkingLabel}
                streamingMessageId={streamingMessageId}
                size="compact"
                className="min-h-0 flex-1 pr-1"
              />

              <div className="mt-3 flex shrink-0 flex-wrap gap-1.5">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={chatting}
                    onClick={() => void handleSubmit(suggestion)}
                    className="rounded-full border border-[color:rgba(13,71,161,0.16)] bg-white/72 px-2.5 py-1.5 text-left text-[10px] font-medium text-[color:var(--cs-primary)] disabled:opacity-45"
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
                className="mt-2 flex shrink-0 gap-2"
              >
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  disabled={chatting}
                  placeholder={
                    locale === "vi"
                      ? "Hỏi thêm về bệnh nhân..."
                      : "Ask about this patient..."
                  }
                  className="dashboard-input h-10 min-w-0 flex-1 rounded-[0.7rem] px-3 text-[12px] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || chatting}
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

              {exportSummary && !classifyAgentAnswer(exportSummary) ? (
                <button
                  type="button"
                  onClick={() => setExportOpen(true)}
                  className="mt-2 inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-[0.7rem] border border-[color:var(--cs-teal)] bg-white text-[12px] font-semibold text-[color:var(--cs-teal)]"
                >
                  <FileText className="h-4 w-4" />
                  {locale === "vi" ? "Xuất tờ điều trị" : "Export treatment note"}
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </aside>

      {exportOpen ? (
        <TreatmentNoteModal
          patient={patient}
          summary={exportSummary}
          onClose={() => setExportOpen(false)}
        />
      ) : null}
    </>
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
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--cs-primary-soft)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="dashboard-input mt-4 min-h-[320px] w-full rounded-[0.8rem] p-3 text-[12px] leading-5"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-[0.7rem] border border-[color:var(--cs-border)] px-4 text-[12px] font-semibold"
          >
            {locale === "vi" ? "Hủy" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={download}
            className="inline-flex h-10 items-center gap-2 rounded-[0.7rem] bg-[color:var(--cs-primary)] px-4 text-[12px] font-semibold text-white"
          >
            <Download className="h-4 w-4" />
            {locale === "vi" ? "Xuất tệp văn bản" : "Export text"}
          </button>
        </div>
      </div>
    </div>
  );
}
