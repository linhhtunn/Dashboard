"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AgentInsightCard } from "@/components/agent/AgentInsightCard";
import { PanelCard } from "@/components/common/PanelCard";
import { useLocale } from "@/components/providers/LocaleProvider";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { SidebarHistoryItem } from "@/components/dashboard/DashboardExperience";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { PatientSummaryHeader } from "@/components/dashboard/PatientSummaryHeader";
import { fetchAgentAlertExplanation } from "@/lib/ai/chat-client";
import type { AgentInsightPayload } from "@/lib/ai/types";
import {
  formatAlertTimestamp,
  getAlertSeverityLabel,
  getAlertTypeLabel,
} from "@/lib/i18n";
import { alertRepository } from "@/lib/repositories/alert.repository";
import { patientRepository } from "@/lib/repositories/patient.repository";

type AlertInsightState = {
  requestKey: string | null;
  payload: AgentInsightPayload | null;
  error: string | null;
};

export default function AlertsPage() {
  const { locale } = useLocale();
  const alerts = useMemo(() => alertRepository.listOpen(), []);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(
    alerts[0]?.id ?? null,
  );
  const [insightState, setInsightState] = useState<AlertInsightState>({
    requestKey: null,
    payload: null,
    error: null,
  });

  const selectedAlert = useMemo(
    () => alerts.find((alert) => alert.id === selectedAlertId) ?? null,
    [alerts, selectedAlertId],
  );
  const selectedPatient = useMemo(
    () =>
      selectedAlert
        ? patientRepository.findById(selectedAlert.patientId)
        : null,
    [selectedAlert],
  );
  const requestKey = selectedAlert ? `${selectedAlert.id}:${locale}` : null;

  useEffect(() => {
    if (!selectedAlert || !requestKey) return;

    let cancelled = false;

    void fetchAgentAlertExplanation({
      alertId: selectedAlert.id,
      patientId: selectedAlert.patientId,
      locale,
    })
      .then((nextPayload) => {
        if (cancelled) return;

        setInsightState({
          requestKey,
          payload: nextPayload,
          error: null,
        });
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;

        setInsightState({
          requestKey,
          payload: null,
          error:
            nextError instanceof Error
              ? nextError.message
              : locale === "vi"
                ? "Không thể giải thích cảnh báo từ backend AI."
                : "Unable to explain the alert with the AI backend.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [locale, requestKey, selectedAlert]);

  const loading = Boolean(requestKey) && insightState.requestKey !== requestKey;
  const payload =
    insightState.requestKey === requestKey ? insightState.payload : null;
  const error = insightState.requestKey === requestKey ? insightState.error : null;

  const historyItems: SidebarHistoryItem[] = useMemo(
    () => [
      {
        id: "alerts-history-1",
        title:
          locale === "vi"
            ? "Giải thích cảnh báo oxy thấp"
            : "Explain low oxygen alert",
        timestamp: "09:25",
        issue: "SpO₂",
      },
      {
        id: "alerts-history-2",
        title:
          locale === "vi"
            ? "Rà soát cảnh báo huyết áp cao"
            : "Review high blood pressure alert",
        timestamp: "08:40",
        issue: locale === "vi" ? "Huyết áp" : "Blood pressure",
      },
      {
        id: "alerts-history-3",
        title:
          locale === "vi"
            ? "Tổng hợp cảnh báo đang mở"
            : "Summarize open alerts",
        timestamp: locale === "vi" ? "Hôm qua" : "Yesterday",
        issue: locale === "vi" ? "Danh sách" : "List",
      },
    ],
    [locale],
  );

  return (
    <DashboardShell
      activeNav="alerts"
      historyItems={historyItems}
      onCreateNewChat={() => undefined}
      topBar={<DashboardTopBar />}
      patientPanelOpen={Boolean(selectedAlert)}
      leftPanel={
        <section className="dashboard-scroll-area h-full overflow-y-auto px-3 py-3">
          <div className="mx-auto max-w-[1320px] space-y-4">
            <div className="px-1">
              <h1 className="text-[1.8rem] font-semibold text-[color:var(--cs-heading)]">
                {locale === "vi" ? "Cảnh báo lâm sàng" : "Clinical alerts"}
              </h1>
              <p className="mt-1 text-sm text-[color:var(--cs-text-soft)]">
                {locale === "vi"
                  ? "Chọn một cảnh báo để xem phần giải thích từ AI agent."
                  : "Select an alert to inspect the AI explanation."}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <AlertStatCard
                label={locale === "vi" ? "Tổng cảnh báo mở" : "Open alerts"}
                value={alerts.length}
              />
              <AlertStatCard
                label={locale === "vi" ? "Mức warning" : "Warning"}
                value={alerts.filter((alert) => alert.severity === "warning").length}
              />
              <AlertStatCard
                label={locale === "vi" ? "Mức critical" : "Critical"}
                value={alerts.filter((alert) => alert.severity === "critical").length}
              />
            </div>

            <div className="space-y-3">
              {alerts.map((alert) => {
                const patient = patientRepository.findById(alert.patientId);
                const selected = alert.id === selectedAlertId;

                return (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => setSelectedAlertId(alert.id)}
                    className={[
                      "dashboard-surface flex w-full items-start justify-between rounded-[1.35rem] px-4 py-4 text-left transition",
                      selected
                        ? "border-[color:rgba(13,71,161,0.28)] shadow-[0_18px_34px_rgba(13,71,161,0.08)]"
                        : "hover:border-[color:rgba(13,71,161,0.18)]",
                    ].join(" ")}
                  >
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[color:rgba(13,71,161,0.08)] px-3 py-1 text-xs font-semibold text-[color:var(--cs-primary)]">
                          {getAlertSeverityLabel(alert.severity, locale)}
                        </span>
                        <span className="text-xs text-[color:var(--cs-text-soft)]">
                          {formatAlertTimestamp(alert.timestamp, locale)}
                        </span>
                      </div>

                      <p className="text-base font-semibold text-[color:var(--cs-heading)]">
                        {getAlertTypeLabel(alert.type, locale)}
                      </p>

                      <p className="text-sm text-[color:var(--cs-text)]">
                        {patient?.name ?? alert.patientId}
                      </p>

                      <p className="text-sm text-[color:var(--cs-text-soft)]">
                        {patient
                          ? `MRN ${patient.mrn} · ${patient.age} ${locale === "vi" ? "tuổi" : "years"}`
                          : alert.patientId}
                      </p>
                    </div>

                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[color:var(--cs-text-soft)]" />
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      }
      rightPanel={
        <section className="dashboard-scroll-area h-full overflow-y-auto px-2 py-3">
          <div className="space-y-4">
            {selectedPatient ? <PatientSummaryHeader patient={selectedPatient} /> : null}

            {selectedAlert ? (
              <AgentInsightCard
                title={locale === "vi" ? "Giải thích cảnh báo" : "Alert explanation"}
                payload={payload}
                loading={loading}
                error={error}
                emptyCopy={{
                  vi: "Chọn một cảnh báo để xem phần giải thích từ backend AI.",
                  en: "Select an alert to inspect the AI explanation.",
                }}
              />
            ) : null}

            {selectedPatient ? (
              <PanelCard className="px-4 py-4">
                <p className="text-sm font-medium text-[color:var(--cs-teal)]">
                  {locale === "vi" ? "Đi tới hồ sơ bệnh nhân" : "Open patient record"}
                </p>
                <p className="mt-2 text-sm text-[color:var(--cs-text-soft)]">
                  {locale === "vi"
                    ? "Mở hồ sơ để xem đầy đủ chỉ số, bối cảnh lâm sàng và lịch sử theo dõi."
                    : "Open the patient record to inspect full metrics and clinical context."}
                </p>
                <Link
                  href={`/patients/${selectedPatient.id}`}
                  className="mt-4 inline-flex h-10 items-center rounded-full bg-[color:var(--cs-primary)] px-4 text-sm font-semibold text-white"
                >
                  {locale === "vi" ? "Xem hồ sơ bệnh nhân" : "View patient record"}
                </Link>
              </PanelCard>
            ) : null}
          </div>
        </section>
      }
    />
  );
}

function AlertStatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <PanelCard className="px-4 py-4">
      <p className="text-sm text-[color:var(--cs-text-soft)]">{label}</p>
      <p className="mt-2 text-[1.55rem] font-semibold text-[color:var(--cs-heading)]">
        {value}
      </p>
    </PanelCard>
  );
}
