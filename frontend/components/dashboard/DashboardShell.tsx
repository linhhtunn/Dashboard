import type { ReactNode } from "react";

import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

type DashboardShellProps = {
  topBar: ReactNode;
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  activeNav?: "dashboard" | "patients" | "alerts" | "settings";
};

export function DashboardShell({
  topBar,
  leftPanel,
  rightPanel,
  activeNav = "dashboard",
}: DashboardShellProps) {
  return (
    <div className="dashboard-canvas min-h-screen text-[color:var(--cs-text)]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-5 px-4 py-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-6 lg:py-6">
        <DashboardSidebar activeItem={activeNav} />

        <div className="flex min-h-screen flex-col lg:min-h-[calc(100vh-3rem)]">
          <div className="mb-5 shrink-0">{topBar}</div>

          <div className="grid flex-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_420px] 2xl:grid-cols-[minmax(0,1.45fr)_460px]">
            <section className="min-h-[72vh]">{leftPanel}</section>
            <aside className="min-h-[72vh]">{rightPanel}</aside>
          </div>
        </div>
      </div>
    </div>
  );
}
