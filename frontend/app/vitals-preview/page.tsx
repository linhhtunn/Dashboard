"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { SidebarHistoryItem } from "@/components/dashboard/DashboardExperience";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { MetricCard, TimeRangeSelector, VitalChart } from "@/components/vitals";
import { vitalRepository } from "@/lib/repositories/vital.repository";
import type { MetricSummary, VitalSignalSample } from "@/types";

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

export default function VitalsPreviewPage() {
  const [previewVitals, setPreviewVitals] = useState<VitalSignalSample[]>([]);
  const [previewSummaries, setPreviewSummaries] = useState<MetricSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      vitalRepository.listByPatient("P001"),
      vitalRepository.listMetricSummaries("P001"),
    ])
      .then(([vitals, summaries]) => {
        if (cancelled) return;
        setPreviewVitals(vitals);
        setPreviewSummaries(summaries);
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Không thể tải dữ liệu preview chỉ số sinh tồn.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

            {loading ? (
              <div className="dashboard-surface rounded-[1rem] px-4 py-6 text-[14px] text-[color:var(--cs-text-soft)]">
                Đang tải dữ liệu preview...
              </div>
            ) : error ? (
              <div className="dashboard-surface rounded-[1rem] px-4 py-6 text-[14px] text-[color:var(--cs-danger)]">
                {error}
              </div>
            ) : (
              <>
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
                    Biểu đồ SpO2 độc lập
                  </h2>
                  <div className="mt-4">
                    <VitalChart data={previewVitals} metric="spo2" height={180} />
                  </div>
                </article>
              </>
            )}
          </div>
        </section>
      }
      rightPanel={null}
    />
  );
}
