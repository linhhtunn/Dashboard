import type { ReactNode } from "react";

type DashboardShellProps = {
  topBar: ReactNode;
  leftPanel: ReactNode;
  rightPanel: ReactNode;
};

export function DashboardShell({
  topBar,
  leftPanel,
  rightPanel,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-[#F2F5F8] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-4 lg:px-6 lg:py-5">
        <div className="mb-4 shrink-0">{topBar}</div>

        <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_420px] 2xl:grid-cols-[minmax(0,1.45fr)_460px]">
          <section className="min-h-[72vh]">{leftPanel}</section>
          <aside className="min-h-[72vh]">{rightPanel}</aside>
        </div>
      </div>
    </div>
  );
}