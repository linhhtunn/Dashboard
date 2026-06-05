"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AlertItem } from "@/components/alerts";
import { AgentInsightCard } from "@/components/agent/AgentInsightCard";
import { PanelCard } from "@/components/common/PanelCard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { SidebarHistoryItem } from "@/components/dashboard/DashboardExperience";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { PatientSummaryHeader } from "@/components/dashboard/PatientSummaryHeader";
import { useLocale } from "@/components/providers/LocaleProvider";
import { MetricCard, TimeRangeSelector } from "@/components/vitals";
import { fetchAgentSummary } from "@/lib/ai/chat-client";
import type { AgentInsightPayload } from "@/lib/ai/types";
import { getConditionLabel, getSymptomLabel, localizeText } from "@/lib/i18n";
import { alertRepository } from "@/lib/repositories/alert.repository";
import { patientRepository } from "@/lib/repositories/patient.repository";
import { vitalRepository } from "@/lib/repositories/vital.repository";
import type { Alert, MetricSummary, Patient, VitalSignalSample } from "@/types";

type SummaryState = {
  requestKey: string | null;
  payload: AgentInsightPayload | null;
  error: string | null;
};

export default function PatientDetailPage() {
  const { locale } = useLocale();
  const params = useParams<{ patientId: string }>();
  const patientId = params.patientId;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vitals, setVitals] = useState<VitalSignalSample[]>([]);
  const [summaries, setSummaries] = useState<MetricSummary[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingRecord, setLoadingRecord] = useState(true);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [summaryState, setSummaryState] = useState<SummaryState>({
    requestKey: null,
    payload: null,
    error: null,
  });

  const requestKey = patient ? `${patient.id}:${locale}` : null;

  useEffect(() => {
    let cancelled = false;
    setLoadingRecord(true);

    void Promise.all([
      patientRepository.findById(patientId),
      vitalRepository.listByPatient(patientId),
      vitalRepository.listMetricSummaries(patientId),
      alertRepository.listByPatient(patientId),
    ])
      .then(([nextPatient, nextVitals, nextSummaries, nextAlerts]) => {
        if (cancelled) return;
        setPatient(nextPatient);
        setVitals(nextVitals);
        setSummaries(nextSummaries);
        setAlerts(nextAlerts);
        setRecordError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setRecordError(
          error instanceof Error
            ? error.message
            : locale === "vi"
              ? "Không thể tải hồ sơ bệnh nhân."
              : "Unable to load patient record.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingRecord(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locale, patientId]);

  useEffect(() => {
    if (!patient || !requestKey) return;

    let cancelled = false;

    void fetchAgentSummary({ patientId: patient.id, locale })
      .then((payload) => {
        if (cancelled) return;
        setSummaryState({ requestKey, payload, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSummaryState({
          requestKey,
          payload: null,
          error:
            error instanceof Error
              ? error.message
              : locale === "vi"
                ? "Không thể tải tóm tắt từ backend AI."
                : "Unable to load the AI summary.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [locale, patient, requestKey]);

  const summaryLoading = Boolean(requestKey) && summaryState.requestKey !== requestKey;
  const agentSummary =
    summaryState.requestKey === requestKey ? summaryState.payload : null;
  const summaryError =
    summaryState.requestKey === requestKey ? summaryState.error : null;

  const historyItems: SidebarHistoryItem[] = useMemo(
    () => [
      {
        id: "patient-history-1",
        title: locale === "vi" ? "Xem lại diễn tiến SpO₂" : "Review SpO₂ trend",
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
        title: locale === "vi" ? "Rà soát cảnh báo đang mở" : "Review open alerts",
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
          <section className="flex h-full items-center justify-center px-4 py-4">
            <div className="dashboard-surface rounded-[1.25rem] px-5 py-6 text-center">
              <h1 className="text-[1.55rem] font-semibold text-[color:var(--cs-heading)]">
                {locale === "vi" ? "Không tìm thấy hồ sơ bệnh nhân" : "Patient record not found"}
              </h1>
              <p className="mt-2 text-[13px] text-[color:var(--cs-text-soft)]">
                {loadingRecord
                  ? locale === "vi"
                    ? "Đang tải hồ sơ bệnh nhân..."
                    : "Loading patient record..."
                  : recordError
                    ? recordError
                    : locale === "vi"
                      ? `Mã hồ sơ ${patientId} hiện chưa có trong backend.`
                      : `Record ID ${patientId} is not available in the backend.`}
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
        <section className="dashboard-scroll-area h-full overflow-y-auto px-2.5 py-2.5">
          <div className="mx-auto max-w-[1800px] space-y-4">
            <PatientSummaryHeader patient={patient} />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,0.88fr)]">
              <PanelCard className="px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[color:var(--cs-teal)]">
                      {locale === "vi" ? "Chỉ số sinh tồn" : "Vital signs"}
                    </p>
                    <h2 className="mt-1.5 text-[1.25rem] font-semibold text-[color:var(--cs-heading)]">
                      {locale === "vi"
                        ? "Theo dõi 15 phút gần nhất"
                        : "Latest 15-minute monitoring"}
                    </h2>
                  </div>
                  <TimeRangeSelector />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {summaries.map((summary) => (
                    <MetricCard key={summary.metric} summary={summary} vitals={vitals} />
                  ))}
                </div>
              </PanelCard>

              <div className="space-y-4">
                <AgentInsightCard
                  title={locale === "vi" ? "Tóm tắt từ AI" : "AI summary"}
                  payload={agentSummary}
                  loading={summaryLoading}
                  error={summaryError}
                  emptyCopy={{
                    vi: "Chưa có tóm tắt từ backend AI cho bệnh nhân này.",
                    en: "No AI summary is available for this patient yet.",
                  }}
                />

                <PanelCard className="px-4 py-4">
                  <p className="text-sm font-medium text-[color:var(--cs-teal)]">
                    {locale === "vi" ? "Bối cảnh bệnh nhân" : "Patient context"}
                  </p>

                  <div className="mt-3 space-y-3 text-[13px] text-[color:var(--cs-text)]">
                    <div>
                      <p className="font-semibold text-[color:var(--cs-heading)]">
                        {locale === "vi" ? "Bệnh nền" : "Underlying conditions"}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {patient.underlyingConditionCodes.map((code) => (
                          <span key={code} className="rounded-full bg-white/72 px-2.5 py-1">
                            {getConditionLabel(code, locale)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-[color:var(--cs-heading)]">
                        {locale === "vi" ? "Triệu chứng gần đây" : "Recent symptoms"}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {patient.recentSymptomCodes.length > 0 ? (
                          patient.recentSymptomCodes.map((code) => (
                            <span key={code} className="rounded-full bg-white/72 px-2.5 py-1">
                              {getSymptomLabel(code, locale)}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full bg-white/72 px-2.5 py-1">
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
                      <div className="mt-1.5 space-y-1.5">
                        {patient.medicationCycle.length > 0 ? (
                          patient.medicationCycle.map((medication) => (
                            <div
                              key={`${localizeText(medication.medication, locale)}-${medication.nextDoseAt ?? "none"}`}
                              className="rounded-[0.9rem] bg-white/72 px-3.5 py-2.5"
                            >
                              <p className="font-medium text-[color:var(--cs-heading)]">
                                {localizeText(medication.medication, locale)} · {medication.dosage}
                              </p>
                              <p className="mt-0.5 text-[12px] text-[color:var(--cs-text-soft)]">
                                {localizeText(medication.schedule, locale)}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[0.9rem] bg-white/72 px-3.5 py-2.5 text-[12px] text-[color:var(--cs-text-soft)]">
                            {locale === "vi"
                              ? "Chưa có lịch dùng thuốc tiếp theo."
                              : "No upcoming medication schedule."}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </PanelCard>

                <PanelCard className="px-4 py-4">
                  <p className="text-sm font-medium text-[color:var(--cs-teal)]">
                    {locale === "vi" ? "Cảnh báo theo dõi" : "Monitoring alerts"}
                  </p>
                  <h2 className="mt-1.5 text-[1.25rem] font-semibold text-[color:var(--cs-heading)]">
                    {locale === "vi" ? "Danh sách cảnh báo đang hoạt động" : "Active alert list"}
                  </h2>

                  <div className="mt-4 space-y-2.5">
                    {alerts.length > 0 ? (
                      alerts.map((alert) => <AlertItem key={alert.id} alert={alert} />)
                    ) : (
                      <div className="rounded-[1rem] bg-white/72 px-4 py-4 text-[13px] text-[color:var(--cs-text-soft)]">
                        {locale === "vi"
                          ? "Chưa có cảnh báo nào đang mở cho bệnh nhân này."
                          : "There are no open alerts for this patient."}
                      </div>
                    )}
                  </div>
                </PanelCard>
              </div>
            </div>
          </div>
        </section>
      }
      rightPanel={null}
    />
  );
}
