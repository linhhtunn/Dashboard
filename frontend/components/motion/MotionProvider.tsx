"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

import { easeOutExpo } from "@/lib/motion/presets";

type MotionProviderProps = {
  children: ReactNode;
};

export function MotionProvider({ children }: MotionProviderProps) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.45, ease: easeOutExpo }}
    >
      {children}
    </MotionConfig>
  );
}
