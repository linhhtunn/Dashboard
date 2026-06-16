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

const MIN_HEIGHT = 36;
const MAX_HEIGHT = 72;

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
        "dashboard-glass relative rounded-[1.2rem] border border-white/55 bg-white/42 px-4 py-2.5 shadow-[0_20px_48px_rgba(15,23,42,0.08)]",
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
        className="max-h-[72px] min-h-[36px] w-full resize-none bg-transparent pr-12 text-[16px] font-medium leading-7 text-slate-800 outline-none placeholder:text-[rgba(51,65,85,0.72)]"
      />

      {hasValue ? (
        <button
          type="submit"
          className="absolute bottom-2.5 right-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--cs-teal)_0%,var(--cs-primary)_100%)] text-white shadow-[0_14px_28px_rgba(13,71,161,0.22)] transition hover:scale-[1.02] hover:shadow-[0_18px_34px_rgba(13,71,161,0.28)]"
          aria-label={submitLabel}
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      ) : null}
    </form>
  );
}
