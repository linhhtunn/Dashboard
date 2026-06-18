"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

type AuthMessageProps = {
  children: ReactNode;
  tone?: "error" | "info" | "success";
};

const toneClass: Record<NonNullable<AuthMessageProps["tone"]>, string> = {
  error:
    "border-[color:rgba(229,72,77,0.22)] bg-[color:rgba(229,72,77,0.08)] text-[color:var(--cs-danger)]",
  info: "border-[color:rgba(0,150,136,0.2)] bg-[color:rgba(0,150,136,0.08)] text-[color:var(--cs-text)]",
  success:
    "border-[color:rgba(0,150,136,0.28)] bg-[color:rgba(0,150,136,0.12)] text-[color:var(--cs-teal)]",
};

export function AuthMessage({ children, tone = "info" }: AuthMessageProps) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={[
        "rounded-[0.7rem] border px-3 py-2 text-[12px] leading-5",
        toneClass[tone],
      ].join(" ")}
    >
      {children}
    </motion.p>
  );
}
