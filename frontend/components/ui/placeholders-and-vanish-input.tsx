"use client";

import { AnimatePresence, motion } from "motion/react";
import { SendHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { cn } from "@/lib/utils";

type PlaceholdersAndVanishInputProps = {
  placeholders: string[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  autoFocus?: boolean;
};

export function PlaceholdersAndVanishInput({
  placeholders,
  onChange,
  onSubmit,
  value,
  onValueChange,
  className,
  autoFocus = false,
}: PlaceholdersAndVanishInputProps) {
  const { locale } = useLocale();
  const isControlled = typeof value === "string";
  const [internalValue, setInternalValue] = useState("");
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<number | null>(null);

  const inputValue = isControlled ? value : internalValue;
  const hasValue = inputValue.trim().length > 0;

  useEffect(() => {
    const clearAnimation = () => {
      if (intervalRef.current === null) return;

      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };

    const startAnimation = () => {
      if (placeholders.length <= 1 || intervalRef.current !== null) return;

      intervalRef.current = window.setInterval(() => {
        setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
      }, 3000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        clearAnimation();
        return;
      }

      startAnimation();
    };

    startAnimation();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearAnimation();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [placeholders]);

  const currentValuePlaceholder = useMemo(
    () => placeholders[currentPlaceholder] ?? "",
    [currentPlaceholder, placeholders],
  );

  const updateValue = (
    nextValue: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
    onChange(event);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!hasValue) return;
        onSubmit(event);
      }}
      className={cn(
        "dashboard-glass relative mx-auto w-full max-w-xl rounded-full border border-[color:rgba(217,226,236,0.72)] bg-white/80 px-5 py-3.5 backdrop-blur-[22px]",
        className,
      )}
    >
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        value={inputValue}
        type="text"
        onChange={(event) => updateValue(event.target.value, event)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (!hasValue) return;
            inputRef.current?.form?.requestSubmit();
          }
        }}
        className="relative z-20 h-9 w-full bg-transparent pr-14 text-[20px] font-medium text-slate-800 outline-none placeholder:text-transparent"
        placeholder={currentValuePlaceholder}
      />

      {!hasValue ? (
        <div className="pointer-events-none absolute inset-y-0 left-5 right-14 flex items-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={`placeholder-${currentPlaceholder}`}
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -15, opacity: 0 }}
              transition={{ duration: 0.3, ease: "linear" }}
              className="block truncate text-[20px] font-medium text-[rgba(51,65,85,0.58)]"
            >
              {currentValuePlaceholder}
            </motion.p>
          </AnimatePresence>
        </div>
      ) : null}

      <button
        disabled={!hasValue}
        type="submit"
        className={cn(
          "absolute right-3.5 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-[0_12px_24px_rgba(13,71,161,0.2)] transition duration-200",
          hasValue
            ? "bg-[linear-gradient(135deg,var(--cs-teal)_0%,var(--cs-primary)_100%)] hover:scale-[1.02]"
            : "bg-slate-200 text-slate-400 shadow-none",
        )}
        aria-label={locale === "vi" ? "Gửi câu hỏi" : "Send question"}
      >
        <SendHorizontal className="h-4.5 w-4.5" />
      </button>
    </form>
  );
}
