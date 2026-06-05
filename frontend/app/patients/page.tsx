"use client";

import { useMemo } from "react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { SidebarHistoryItem } from "@/components/dashboard/DashboardExperience";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { PatientTable, type PatientListItem } from "@/components/patients";
import { alertRepository } from "@/lib/repositories/alert.repository";
import { patientRepository } from "@/lib/repositories/patient.repository";
import { vitalRepository } from "@/lib/repositories/vital.repository";

function getLatestVital(patientId: string) {
  const vitals = vitalRepository.listByPatient(patientId);

  return (
    [...vitals].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )[0] ?? null
  );
}

export default function PatientsPage() {
  const { locale } = useLocale();
  const items: PatientListItem[] = useMemo(() => {
    const openAlerts = alertRepository.listOpen();

    return patientRepository.list().map((patient) => ({
      patient,
      latestVital: getLatestVital(patient.id),
      openAlertCount: openAlerts.filter((alert) => alert.patientId === patient.id)
        .length,
    }));
  }, []);

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
              <PatientTable items={items} />
            </div>
          </div>
        </section>
      }
      rightPanel={null}
    />
  );
}
