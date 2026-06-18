"use client";

import Link from "next/link";
import { AlertTriangle, Activity, HeartPulse } from "lucide-react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { getPatientStatusLabel } from "@/lib/i18n";
import type { ReportInsightsResponse } from "@/lib/report/types";

type ReportInsightsPanelProps = {
  data: ReportInsightsResponse | null;
  loading: boolean;
  labels: {
    title: string;
    patientStatus: string;
    alertsToday: string;
    workflow: string;
    vitals: string;
    attention: string;
    open: string;
    pendingDoctor: string;
    resolved: string;
    unresolved: string;
    avgSpo2: string;
    avgHr: string;
    lowSpo2: string;
    elevatedHr: string;
    critical: string;
    warning: string;
    viewChart: string;
    status: {
      critical: string;
      at_risk: string;
      recent_symptom: string;
      healthy: string;
    };
  };
};

export function ReportInsightsPanel({
  data,
  loading,
  labels,
}: ReportInsightsPanelProps) {
  const { locale } = useLocale();

  if (loading || !data) {
    return <div className="dashboard-surface h-[320px] animate-pulse rounded-[1rem]" />;
  }

  const statusTotal =
    data.patient_status.critical +
    data.patient_status.at_risk +
    data.patient_status.recent_symptom +
    data.patient_status.healthy;

  const statusRows = [
    { key: "critical" as const, count: data.patient_status.critical, color: "bg-[color:var(--cs-danger)]" },
    { key: "at_risk" as const, count: data.patient_status.at_risk, color: "bg-[#F5B300]" },
    { key: "recent_symptom" as const, count: data.patient_status.recent_symptom, color: "bg-[#8ED3E6]" },
    { key: "healthy" as const, count: data.patient_status.healthy, color: "bg-[color:var(--cs-teal)]" },
  ];

  return (
    <section className="dashboard-surface h-full rounded-[1rem] px-4 py-4">
      <h2 className="text-[13px] font-semibold text-[color:var(--cs-heading)]">
        {labels.title}
      </h2>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cs-text-soft)]">
              {labels.patientStatus}
            </p>
            <div className="mt-2 space-y-2">
              {statusRows.map((row) => (
                <div key={row.key}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="text-[color:var(--cs-text)]">
                      {labels.status[row.key]}
                    </span>
                    <span className="font-semibold text-[color:var(--cs-heading)]">
                      {row.count}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[color:rgba(13,71,161,0.08)]">
                    <div
                      className={["h-full rounded-full transition-all", row.color].join(" ")}
                      style={{
                        width: statusTotal
                          ? `${Math.max(4, (row.count / statusTotal) * 100)}%`
                          : "0%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cs-text-soft)]">
              {labels.alertsToday}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <MetricChip
                label={labels.critical}
                value={data.alerts_today.critical}
                tone="danger"
              />
              <MetricChip
                label={labels.warning}
                value={data.alerts_today.warning}
                tone="warning"
              />
              <MetricChip
                label={labels.unresolved}
                value={data.alerts_today.open_unresolved}
                tone="danger"
              />
              <MetricChip
                label={labels.pendingDoctor}
                value={data.alerts_today.pending_doctor}
                tone="warning"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cs-text-soft)]">
              {labels.workflow}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <MetricChip label={labels.open} value={data.workflow_period.open} />
              <MetricChip
                label={labels.pendingDoctor}
                value={data.workflow_period.pending_doctor}
                tone="warning"
              />
              <MetricChip
                label={labels.resolved}
                value={data.workflow_period.resolved}
                tone="good"
              />
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cs-text-soft)]">
              {labels.vitals}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-[0.8rem] bg-[color:rgba(13,71,161,0.05)] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] text-[color:var(--cs-text-soft)]">
                  <Activity className="h-3.5 w-3.5" />
                  {labels.avgSpo2}
                </div>
                <p className="mt-1 text-[1.1rem] font-semibold text-[color:var(--cs-heading)]">
                  {data.vitals_snapshot.avg_spo2 !== null
                    ? `${data.vitals_snapshot.avg_spo2}%`
                    : "—"}
                </p>
                <p className="mt-0.5 text-[10px] text-[color:var(--cs-danger)]">
                  {data.vitals_snapshot.low_spo2_patients} {labels.lowSpo2}
                </p>
              </div>
              <div className="rounded-[0.8rem] bg-[color:rgba(13,71,161,0.05)] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] text-[color:var(--cs-text-soft)]">
                  <HeartPulse className="h-3.5 w-3.5" />
                  {labels.avgHr}
                </div>
                <p className="mt-1 text-[1.1rem] font-semibold text-[color:var(--cs-heading)]">
                  {data.vitals_snapshot.avg_hr !== null
                    ? `${data.vitals_snapshot.avg_hr} bpm`
                    : "—"}
                </p>
                <p className="mt-0.5 text-[10px] text-[color:#B8860B]">
                  {data.vitals_snapshot.elevated_hr_patients} {labels.elevatedHr}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cs-text-soft)]">
              {labels.attention}
            </p>
            <ul className="mt-2 space-y-1.5">
              {data.attention_patients.length === 0 ? (
                <li className="text-[11px] text-[color:var(--cs-text-soft)]">
                  {locale === "vi"
                    ? "Không có bệnh nhân cần ưu tiên đặc biệt hôm nay."
                    : "No patients need special priority today."}
                </li>
              ) : (
                data.attention_patients.map((patient) => (
                  <li
                    key={patient.patient_id}
                    className="flex items-center justify-between gap-2 rounded-[0.7rem] bg-[color:rgba(229,72,77,0.06)] px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-[color:var(--cs-heading)]">
                        {patient.patient_name}
                      </p>
                      <p className="text-[10px] text-[color:var(--cs-text-soft)]">
                        {patient.bed ?? "—"} ·{" "}
                        {getPatientStatusLabel(patient.status, locale)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {patient.critical_alerts > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[color:var(--cs-danger)]">
                          <AlertTriangle className="h-3 w-3" />
                          {patient.critical_alerts}
                        </span>
                      ) : null}
                      <Link
                        href={`/patients/${patient.patient_id}`}
                        className="text-[10px] font-semibold text-[color:var(--cs-primary)]"
                      >
                        {labels.viewChart}
                      </Link>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricChip({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "danger" | "warning" | "good";
}) {
  const toneClass =
    tone === "danger"
      ? "text-[color:var(--cs-danger)]"
      : tone === "warning"
        ? "text-[#B8860B]"
        : tone === "good"
          ? "text-[color:var(--cs-teal)]"
          : "text-[color:var(--cs-heading)]";

  return (
    <div className="rounded-[0.8rem] bg-[color:rgba(13,71,161,0.05)] px-3 py-2">
      <p className="text-[10px] text-[color:var(--cs-text-soft)]">{label}</p>
      <p className={["text-[1.15rem] font-semibold", toneClass].join(" ")}>
        {value}
      </p>
    </div>
  );
}
