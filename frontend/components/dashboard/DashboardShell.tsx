"use client";

import { useState, type ReactNode } from "react";

import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import type { SidebarHistoryItem } from "@/components/dashboard/DashboardExperience";

import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

type DashboardShellProps = {
  topBar: ReactNode;
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  activeNav?: "dashboard" | "patients" | "alerts" | "settings";
  activeThreadId?: string;
  patientPanelOpen?: boolean;
  historyItems: SidebarHistoryItem[];
  historyDisabled?: boolean;
  onCreateNewChat: () => void;
  onSelectThread?: (threadId: string) => void;
};

export function DashboardShell({
  topBar,
  leftPanel,
  rightPanel,
  activeNav = "dashboard",
  activeThreadId,
  patientPanelOpen = false,
  historyItems,
  historyDisabled = false,
  onCreateNewChat,
  onSelectThread = () => undefined,
}: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="dashboard-canvas flex h-dvh w-full overflow-hidden p-4 text-[color:var(--cs-text)] xl:p-3.5">
      <div
        className={[
          "grid h-full w-full min-h-0 gap-2 overflow-hidden",
          sidebarCollapsed
            ? "lg:grid-cols-[88px_minmax(0,1fr)]"
            : "lg:grid-cols-[286px_minmax(0,1fr)]",
        ].join(" ")}
      >
        <DashboardSidebar
          activeItem={activeNav}
          activeThreadId={activeThreadId}
          collapsed={sidebarCollapsed}
          historyItems={historyItems}
          historyDisabled={historyDisabled}
          onCreateNewChat={onCreateNewChat}
          onSelectThread={onSelectThread}
          onToggle={() => setSidebarCollapsed((current) => !current)}
        />

        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="relative z-30 mb-1.5 shrink-0">{topBar}</div>

          <div
            className={[
              "grid min-h-0 min-w-0 flex-1 gap-2 overflow-hidden transition-all duration-300",
              patientPanelOpen
                ? "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_500px] 2xl:grid-cols-[minmax(0,1fr)_580px]"
                : "grid-cols-1",
            ].join(" ")}
          >
            <section className="min-h-0 min-w-0">{leftPanel}</section>

            <aside
              className={[
                "min-h-0 min-w-0 overflow-hidden transition-all duration-300",
                patientPanelOpen
                  ? "translate-x-0 opacity-100"
                  : "pointer-events-none w-0 translate-x-8 opacity-0",
              ].join(" ")}
            >
              {rightPanel}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
