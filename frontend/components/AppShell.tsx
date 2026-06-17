"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { GlobalAlertModal } from "@/components/clinical/GlobalAlertModal";
import { isPublicPageRoute } from "@/lib/auth/public-routes";

export function ClinicalChrome() {
  const pathname = usePathname();

  if (isPublicPageRoute(pathname)) {
    return null;
  }

  return <GlobalAlertModal />;
}

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isPublic = isPublicPageRoute(pathname);

  return (
    <div
      className={
        isPublic
          ? "public-page dashboard-canvas min-h-dvh w-full overflow-x-hidden overflow-y-auto"
          : "dashboard-canvas relative h-dvh overflow-hidden"
      }
    >
      {children}
    </div>
  );
}
