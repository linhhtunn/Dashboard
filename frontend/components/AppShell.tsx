"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { GlobalAlertModal } from "@/components/clinical/GlobalAlertModal";

function isMarketingRoute(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth")
  );
}

export function ClinicalChrome() {
  const pathname = usePathname();

  if (isMarketingRoute(pathname)) {
    return null;
  }

  return <GlobalAlertModal />;
}

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const marketing = isMarketingRoute(pathname);

  return (
    <div
      className={
        marketing
          ? "marketing-page dashboard-canvas min-h-dvh w-full overflow-x-hidden overflow-y-auto"
          : "dashboard-canvas relative h-dvh overflow-hidden"
      }
    >
      {children}
    </div>
  );
}
