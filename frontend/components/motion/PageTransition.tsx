"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import {
  authPageVariants,
  marketingPageVariants,
} from "@/lib/motion/presets";

type PageTransitionProps = {
  children: ReactNode;
  variant?: "marketing" | "auth";
  className?: string;
};

export function PageTransition({
  children,
  variant = "marketing",
  className = "",
}: PageTransitionProps) {
  const pathname = usePathname();
  const variants =
    variant === "auth" ? authPageVariants : marketingPageVariants;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className={className}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
