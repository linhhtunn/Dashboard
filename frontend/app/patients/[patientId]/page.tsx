"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";

import { AlertItem } from "@/components/alerts";
import { PanelCard } from "@/components/common/PanelCard";
import { useLocale } from "@/components/providers/LocaleProvider";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { SidebarHistoryItem } from "@/components/dashboard/DashboardExperience";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { PatientSummaryHeader } from "@/components/dashboard/PatientSummaryHeader";
import { MetricCard, TimeRangeSelector } from "@/components/vitals";
import { getConditionLabel, getSymptomLabel, localizeText } from "@/lib/i18n";
import { alertRepository } from "@/lib/repositories/alert.repository";
import { patientRepository } from "@/lib/repositories/patient.repository";
import { vitalRepository } from "@/lib/repositories/vital.repository";

export default function PatientDetailPage() {
  const { locale } = useLocale();
  const params = useParams<{ patientId: string }>();
  const patientId = params.patientId;

  const patient = useMemo(
    () => patientRepository.findById(patientId),
    [patientId],
  );
  const vitals = useMemo(() => vitalRepository.listByPatient(patientId), [patientId]);
  const summaries = useMemo(
    () => vitalRepository.listMetricSummaries(patientId),
    [patientId],
  );
  const alerts = useMemo(
    () => alertRepository.listByPatient(patientId),
    [patientId],
  );

  const historyItems: SidebarHistoryItem[] = useMemo(
    () => [
      {
        id: "patient-history-1",
        title:
          locale === "vi" ? "Xem lại diễn tiến SpO₂" : "Review SpO₂ trend",
        timestamp: "09:10",
        issue: locale === "vi" ? "SpO₂ thấp" : "Low SpO₂",
      },
      {
        id: "patient-history-2",
        title:
          locale === "vi"
            ? "Đánh giá chỉ số 15 phút gần nhất"
            : "Assess the latest 15-minute metrics",
        timestamp: "08:35",
        issue: locale === "vi" ? "Nhịp tim" : "Heart rate",
      },
      {
        id: "patient-history-3",
        title:
          locale === "vi"
            ? "Rà soát cảnh báo đang mở"
            : "Review open alerts",
        timestamp: locale === "vi" ? "Hôm qua" : "Yesterday",
        issue: locale === "vi" ? "Cảnh báo" : "Alerts",
      },
    ],
    [locale],
  );

  if (!patient) {
    return (
      <DashboardShell
        activeNav="patients"
        historyItems={historyItems}
        onCreateNewChat={() => undefined}
        topBar={<DashboardTopBar />}
        leftPanel={
          <section className="flex h-full items-center justify-center px-5 py-5">
            <div className="dashboard-surface rounded-[1.5rem] px-6 py-8 text-center">
              <h1 className="text-[1.8rem] font-semibold text-[color:var(--cs-heading)]">
                {locale === "vi"
                  ? "Không tìm thấy hồ sơ bệnh nhân"
                  : "Patient record not found"}
              </h1>
              <p className="mt-3 text-sm text-[color:var(--cs-text-soft)]">
                {locale === "vi"
                  ? `Mã hồ sơ ${patientId} hiện chưa có trong dữ liệu mô phỏng.`
                  : `Record ID ${patientId} is not available in the mock dataset.`}
              </p>
            </div>
          </section>
        }
        rightPanel={null}
      />
    );
  }

  return (
    <DashboardShell
      activeNav="patients"
      historyItems={historyItems}
      onCreateNewChat={() => undefined}
      topBar={<DashboardTopBar />}
      leftPanel={
        <section className="dashboard-scroll-area h-full overflow-y-auto px-5 py-5">
          <div className="mx-auto max-w-6xl space-y-5">
            <PatientSummaryHeader patient={patient} />

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
              <PanelCard className="px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[color:var(--cs-teal)]">
                      {locale === "vi" ? "Chỉ số sinh tồn" : "Vital signs"}
                    </p>
                    <h2 className="mt-2 text-[1.45rem] font-semibold text-[color:var(--cs-heading)]">
                      {locale === "vi"
                        ? "Theo dõi 15 phút gần nhất"
                        : "Latest 15-minute monitoring"}
                    </h2>
                  </div>
                  <TimeRangeSelector />
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {summaries.map((summary) => (
                    <MetricCard
                      key={summary.metric}
                      summary={summary}
                      vitals={vitals}
                    />
                  ))}
                </div>
              </PanelCard>

              <div className="space-y-5">
                <PanelCard className="px-5 py-5">
                  <p className="text-sm font-medium text-[color:var(--cs-teal)]">
                    {locale === "vi" ? "Bối cảnh bệnh nhân" : "Patient context"}
                  </p>
                  <div className="mt-4 space-y-4 text-sm text-[color:var(--cs-text)]">
                    <div>
                      <p className="font-semibold text-[color:var(--cs-heading)]">
                        {locale === "vi" ? "Bệnh nền" : "Underlying conditions"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {patient.underlyingConditionCodes.map((code) => (
                          <span
                            key={code}
                            className="rounded-full bg-white/72 px-3 py-1.5"
                          >
                            {getConditionLabel(code, locale)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-[color:var(--cs-heading)]">
                        {locale === "vi" ? "Triệu chứng gần đây" : "Recent symptoms"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {patient.recentSymptomCodes.length > 0 ? (
                          patient.recentSymptomCodes.map((code) => (
                            <span
                              key={code}
                              className="rounded-full bg-white/72 px-3 py-1.5"
                            >
                              {getSymptomLabel(code, locale)}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full bg-white/72 px-3 py-1.5">
                            {locale === "vi"
                              ? "Chưa ghi nhận triệu chứng mới"
                              : "No newly recorded symptoms"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-[color:var(--cs-heading)]">
                        {locale === "vi" ? "Liều thuốc tiếp theo" : "Next medication dose"}
                      </p>
                      <div className="mt-2 space-y-2">
                        {patient.medicationCycle.length > 0 ? (
                          patient.medicationCycle.map((medication) => (
                            <div
                              key={`${localizeText(medication.medication, locale)}-${medication.nextDoseAt ?? "none"}`}
                              className="rounded-[1rem] bg-white/72 px-4 py-3"
                            >
                              <p className="font-medium text-[color:var(--cs-heading)]">
                                {localizeText(medication.medication, locale)} ·{" "}
                                {medication.dosage}
                              </p>
                              <p className="mt-1 text-sm text-[color:var(--cs-text-soft)]">
                                {localizeText(medication.schedule, locale)}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[1rem] bg-white/72 px-4 py-3 text-sm text-[color:var(--cs-text-soft)]">
                            {locale === "vi"
                              ? "Chưa có lịch dùng thuốc tiếp theo."
                              : "No upcoming medication schedule."}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </PanelCard>
              </div>
            </div>

            <PanelCard className="px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[color:var(--cs-teal)]">
                    {locale === "vi" ? "Cảnh báo theo dõi" : "Monitoring alerts"}
                  </p>
                  <h2 className="mt-2 text-[1.45rem] font-semibold text-[color:var(--cs-heading)]">
                    {locale === "vi"
                      ? "Danh sách cảnh báo đang hoạt động"
                      : "Active alert list"}
                  </h2>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {alerts.length > 0 ? (
                  alerts.map((alert) => <AlertItem key={alert.id} alert={alert} />)
                ) : (
                  <div className="rounded-[1.2rem] bg-white/72 px-4 py-5 text-sm text-[color:var(--cs-text-soft)]">
                    {locale === "vi"
                      ? "Chưa có cảnh báo nào đang mở cho bệnh nhân này."
                      : "There are no open alerts for this patient."}
                  </div>
                )}
              </div>
            </PanelCard>
          </div>
        </section>
      }
      rightPanel={null}
    />
  );
}
