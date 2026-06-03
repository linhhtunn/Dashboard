"use client";

import { useLayoutEffect, useRef } from "react";
import { SendHorizontal } from "lucide-react";

import { useLocale } from "@/components/providers/LocaleProvider";

type AIComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
};

const MIN_HEIGHT = 40;
const MAX_HEIGHT = 80;

export function AIComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
  autoFocus = false,
  className,
}: AIComposerProps) {
  const { locale } = useLocale();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasValue = value.trim().length > 0;
  const resolvedPlaceholder =
    placeholder ??
    (locale === "vi"
      ? "Đặt câu hỏi về tình trạng bệnh nhân, cảnh báo hoặc xu hướng gần đây..."
      : "Ask about the patient's status, alerts, or recent trends...");
  const submitLabel = locale === "vi" ? "Gửi câu hỏi" : "Send question";

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = `${MIN_HEIGHT}px`;
    const nextHeight = Math.min(
      Math.max(textarea.scrollHeight, MIN_HEIGHT),
      MAX_HEIGHT,
    );
    textarea.style.height = `${nextHeight}px`;
  }, [value]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!hasValue) return;
        onSubmit();
      }}
      className={[
        "dashboard-glass relative rounded-[1.35rem] border border-[color:rgba(217,226,236,0.72)] bg-white/80 px-5 py-3.5 backdrop-blur-[22px]",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      <textarea
        ref={textareaRef}
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (!hasValue) return;
            onSubmit();
          }
        }}
        placeholder={resolvedPlaceholder}
        className="max-h-[80px] min-h-[40px] w-full resize-none bg-transparent pr-14 text-[18px] font-medium leading-8 text-slate-800 outline-none placeholder:text-[rgba(51,65,85,0.72)]"
      />

      {hasValue ? (
        <button
          type="submit"
          className="absolute bottom-3.5 right-3.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--cs-teal)_0%,var(--cs-primary)_100%)] text-white shadow-[0_12px_24px_rgba(13,71,161,0.2)] transition hover:scale-[1.02]"
          aria-label={submitLabel}
        >
          <SendHorizontal className="h-4.5 w-4.5" />
        </button>
      ) : null}
    </form>
  );
}
