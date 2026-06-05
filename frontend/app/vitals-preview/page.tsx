"use client";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { SidebarHistoryItem } from "@/components/dashboard/DashboardExperience";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { MetricCard, TimeRangeSelector, VitalChart } from "@/components/vitals";
import { vitalRepository } from "@/lib/repositories/vital.repository";

const historyItems: SidebarHistoryItem[] = [
  {
    id: "vitals-history-1",
    title: "Rà soát chỉ số 15 phút gần nhất",
    timestamp: "09:05",
    issue: "Vitals",
  },
  {
    id: "vitals-history-2",
    title: "So sánh baseline ca sáng",
    timestamp: "08:15",
    issue: "Theo dõi xu hướng",
  },
];

const previewVitals = vitalRepository.listByPatient("P001");
const previewSummaries = vitalRepository.listMetricSummaries("P001");

export default function VitalsPreviewPage() {
  return (
    <DashboardShell
      activeNav="dashboard"
      historyItems={historyItems}
      onCreateNewChat={() => undefined}
      topBar={<DashboardTopBar />}
      leftPanel={
        <section className="dashboard-scroll-area h-full overflow-y-auto px-4 py-4">
          <div className="mx-auto max-w-6xl space-y-4">
            <div className="dashboard-surface rounded-[1.5rem] px-4 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-[color:var(--cs-teal)]">
                    Vitals preview
                  </p>
                  <h1 className="mt-2 text-[1.7rem] font-semibold leading-tight text-[color:var(--cs-heading)]">
                    Chuẩn hóa component chỉ số sinh tồn theo dashboard
                  </h1>
                </div>
                <TimeRangeSelector />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {previewSummaries.map((summary) => (
                <MetricCard
                  key={summary.metric}
                  summary={summary}
                  vitals={previewVitals}
                />
              ))}
            </div>

            <article className="dashboard-surface rounded-[1.5rem] px-4 py-4">
              <h2 className="text-[1.2rem] font-semibold text-[color:var(--cs-heading)]">
                Biểu đồ SpO₂ độc lập
              </h2>
              <div className="mt-4">
                <VitalChart data={previewVitals} metric="spo2" height={180} />
              </div>
            </article>
          </div>
        </section>
      }
      rightPanel={null}
    />
  );
}
