"use client";

import type { ReactNode } from "react";

import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { AuthTopBar } from "@/components/auth/AuthTopBar";
import { PageTransition } from "@/components/motion/PageTransition";

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="public-page grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,480px)]">
      <AuthBrandPanel />
      <div className="flex min-h-dvh flex-col bg-[color:var(--cs-surface)]/40">
        <AuthTopBar />
        <main className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
          <PageTransition variant="auth" className="w-full max-w-[400px]">
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
