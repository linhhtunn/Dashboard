"use client";

import type { ReactNode } from "react";

import { PageTransition } from "@/components/motion/PageTransition";

export default function MarketingTemplate({ children }: { children: ReactNode }) {
  return <PageTransition variant="marketing">{children}</PageTransition>;
}
