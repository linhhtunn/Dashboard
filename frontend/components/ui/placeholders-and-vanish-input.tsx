"use client";

import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type PlaceholdersAndVanishInputProps = {
  placeholders: string[];
  value?: string;
  onValueChange?: (value: string) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  className?: string;
  autoFocus?: boolean;
};

export function PlaceholdersAndVanishInput({
  placeholders,
  value = "",
  onValueChange,
  onChange,
  onSubmit,
  className,
  autoFocus = false,
}: PlaceholdersAndVanishInputProps) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);

  const safePlaceholders = useMemo(
    () => placeholders.filter((placeholder) => placeholder.trim().length > 0),
    [placeholders],
  );

  useEffect(() => {
    if (safePlaceholders.length <= 1) return;

    const intervalId = window.setInterval(() => {
      setCurrentPlaceholder((current) => (current + 1) % safePlaceholders.length);
    }, 2800);

    return () => window.clearInterval(intervalId);
  }, [safePlaceholders]);

  const activePlaceholder =
    safePlaceholders[currentPlaceholder] ?? "Nhập câu hỏi cho trợ lý AI";

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "dashboard-glass relative mx-auto w-full overflow-hidden rounded-[1.2rem] border border-[color:rgba(217,226,236,0.72)] bg-white/80 px-4 py-2.5 shadow-[0_20px_40px_rgba(148,163,184,0.14)] backdrop-blur-[24px]",
        className,
      )}
    >
      <input
        autoFocus={autoFocus}
        type="text"
        value={value}
        onChange={(event) => {
          onValueChange?.(event.target.value);
          onChange(event);
        }}
        placeholder={activePlaceholder}
        className="w-full bg-transparent pr-11 text-[18px] font-medium leading-7 text-slate-800 outline-none placeholder:text-[rgba(51,65,85,0.72)]"
      />

      <button
        type="submit"
        disabled={value.trim().length === 0}
        className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--cs-primary)_0%,var(--cs-teal)_100%)] text-white shadow-[0_12px_24px_rgba(13,71,161,0.22)] transition duration-200 disabled:cursor-not-allowed disabled:opacity-0"
        aria-label="Gửi câu hỏi"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M5 12h14" />
          <path d="M13 6l6 6-6 6" />
        </svg>
      </button>
    </form>
  );
}
