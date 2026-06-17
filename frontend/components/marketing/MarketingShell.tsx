"use client";

import type { ReactNode } from "react";

import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";

type MarketingShellProps = {
  children: ReactNode;
};

export function MarketingShell({ children }: MarketingShellProps) {
  return (
    <div className="marketing-page flex min-h-dvh flex-col">
      <MarketingNavbar />
      <main className="flex-1 space-y-3 pb-2 pt-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
