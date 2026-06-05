"use client";

import { useEffect, useMemo, useState } from "react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { SidebarHistoryItem } from "@/components/dashboard/DashboardExperience";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { PatientTable, type PatientListItem } from "@/components/patients";
import { patientRepository } from "@/lib/repositories/patient.repository";

export default function PatientsPage() {
  const { locale } = useLocale();
  const [items, setItems] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void patientRepository
      .list()
      .then((payload) => {
        if (cancelled) return;
        setItems(payload);
        setError(null);
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        setError(
          nextError instanceof Error
            ? nextError.message
            : locale === "vi"
              ? "Không thể tải danh sách bệnh nhân."
              : "Unable to load patients.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const historyItems: SidebarHistoryItem[] = useMemo(
    () => [
      {
        id: "patients-history-1",
        title:
          locale === "vi"
            ? "Tóm tắt SpO₂ trong ca sáng"
            : "Morning shift SpO₂ summary",
        timestamp: "08:20",
        issue: locale === "vi" ? "SpO₂ thấp" : "Low SpO₂",
      },
      {
        id: "patients-history-2",
        title:
          locale === "vi"
            ? "Danh sách bệnh nhân cần theo dõi"
            : "Patients requiring monitoring",
        timestamp: "07:45",
        issue: locale === "vi" ? "Ưu tiên lâm sàng" : "Clinical priority",
      },
      {
        id: "patients-history-3",
        title:
          locale === "vi"
            ? "Rà soát hồ sơ trước giao ca"
            : "Review records before handoff",
        timestamp: locale === "vi" ? "Hôm qua" : "Yesterday",
        issue: locale === "vi" ? "Tổng quan" : "Overview",
      },
    ],
    [locale],
  );

  return (
    <DashboardShell
      activeNav="patients"
      historyItems={historyItems}
      onCreateNewChat={() => undefined}
      topBar={<DashboardTopBar />}
      leftPanel={
        <section className="dashboard-scroll-area h-full overflow-y-auto px-2.5 py-2.5">
          <div className="mx-auto flex h-full max-w-[1320px] min-h-0 flex-col gap-2.5">
            <div className="px-1">
              <h1 className="text-[1.55rem] font-semibold leading-tight text-[color:var(--cs-heading)]">
                {locale === "vi" ? "Bệnh nhân" : "Patients"}
              </h1>
            </div>

            <div className="min-h-0 flex-1">
              {loading ? (
                <div className="dashboard-surface rounded-[1rem] px-4 py-6 text-[14px] text-[color:var(--cs-text-soft)]">
                  {locale === "vi" ? "Đang tải danh sách bệnh nhân..." : "Loading patients..."}
                </div>
              ) : error ? (
                <div className="dashboard-surface rounded-[1rem] px-4 py-6 text-[14px] text-[color:var(--cs-danger)]">
                  {error}
                </div>
              ) : (
                <PatientTable items={items} />
              )}
            </div>
          </div>
        </section>
      }
      rightPanel={null}
    />
  );
}
