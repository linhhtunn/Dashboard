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
    <div className="dashboard-canvas flex h-dvh overflow-hidden text-[color:var(--cs-text)]">
      <div className="relative mx-auto grid h-full w-[95vw] max-w-[1800px] min-h-0 gap-5 overflow-hidden py-4 lg:grid-cols-[252px_minmax(0,1fr)] lg:py-5">
        <DashboardSidebar activeItem={activeNav} />

        <div className="flex min-h-0 h-full flex-col overflow-hidden">
          <div className="mb-4 shrink-0">{topBar}</div>

          <div className="grid min-h-0 flex-1 min-w-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-5 overflow-hidden lg:grid-cols-[minmax(0,1.42fr)_minmax(360px,0.95fr)] lg:grid-rows-1 2xl:grid-cols-[minmax(0,1.48fr)_minmax(420px,1fr)]">
            <section className="min-h-0 min-w-0">{leftPanel}</section>
            <aside className="min-h-0 min-w-0">{rightPanel}</aside>
          </div>
        </div>
      </div>
    </div>
  );
}
