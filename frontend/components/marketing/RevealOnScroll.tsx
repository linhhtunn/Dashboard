"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

import { transitionBase } from "@/lib/motion/presets";

type RevealOnScrollProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  lift?: boolean;
};

export function RevealOnScroll({
  children,
  className = "",
  delayMs = 0,
  lift = false,
}: RevealOnScrollProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12, margin: "0px 0px -40px 0px" }}
      transition={{ ...transitionBase, delay: delayMs / 1000 }}
      whileHover={
        lift
          ? { y: -4, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
}
