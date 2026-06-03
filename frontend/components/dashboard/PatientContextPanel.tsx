"use client";

import { Activity, CheckCircle2, HeartPulse, ShieldCheck, X } from "lucide-react";

import { PanelCard } from "@/components/common/PanelCard";
import {
  dashboardMetrics,
  dashboardPatient,
  type DashboardIssue,
  type IssueId,
} from "@/components/dashboard/dashboard-demo-data";
import { PatientSummaryHeader } from "@/components/dashboard/PatientSummaryHeader";

type PatientContextPanelProps = {
  activeIssue: DashboardIssue;
  onClose: () => void;
  onToggleIssue: (issueId: IssueId) => void;
};

type IssueDisplayMetric = {
  key: string;
  title: string;
  value: string;
  unit: string;
  changeLabel: string;
  icon: typeof HeartPulse;
  iconColor: string;
  stroke: string;
};

function getMetricMeta(metricKey: (typeof dashboardMetrics)[number]["metric"]) {
  switch (metricKey) {
    case "heart_rate":
      return {
        title: "Nhịp tim",
        icon: HeartPulse,
        iconColor: "text-[color:#EF4444]",
        stroke: "#0D47A1",
      };
    case "hrv_rmssd":
      return {
        title: "HRV - RMSSD",
        icon: Activity,
        iconColor: "text-[color:#2563EB]",
        stroke: "#009688",
      };
    case "spo2":
      return {
        title: "SpO₂",
        icon: ShieldCheck,
        iconColor: "text-[color:var(--cs-teal)]",
        stroke: "#009688",
      };
    case "systolic_bp":
      return {
        title: "Huyết áp tâm thu",
        icon: ShieldCheck,
        iconColor: "text-[color:var(--cs-gold)]",
        stroke: "#F5B300",
      };
    case "diastolic_bp":
      return {
        title: "Huyết áp tâm trương",
        icon: ShieldCheck,
        iconColor: "text-[color:#FB923C]",
        stroke: "#F59E0B",
      };
    default:
      return {
        title: metricKey,
        icon: Activity,
        iconColor: "text-[color:var(--cs-primary)]",
        stroke: "#0D47A1",
      };
  }
}

function buildIssueMetrics(issue: DashboardIssue): IssueDisplayMetric[] {
  return dashboardMetrics
    .filter((metric) => issue.metricKeys.includes(metric.metric))
    .map((metric) => {
      const meta = getMetricMeta(metric.metric);

      return {
        key: metric.metric,
        title: meta.title,
        value: `${metric.currentValue}`,
        unit: metric.unit,
        changeLabel: `${Math.abs(metric.changePct ?? 0)}% so với 15 phút trước`,
        icon: meta.icon,
        iconColor: meta.iconColor,
        stroke: meta.stroke,
      };
    });
}

function MiniSparkline({ stroke }: { stroke: string }) {
  return (
    <svg
      viewBox="0 0 220 84"
      className="mt-4 h-[84px] w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 56 C18 60, 28 44, 46 48 C64 52, 76 40, 94 43 C112 46, 122 59, 142 57 C160 55, 172 45, 192 48 C204 50, 212 53, 220 51"
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line x1="0" y1="82" x2="220" y2="82" stroke="rgba(217,226,236,0.92)" />
      <line
        x1="0"
        y1="14"
        x2="220"
        y2="14"
        stroke="rgba(217,226,236,0.52)"
        strokeDasharray="4 5"
      />
    </svg>
  );
}

export function PatientContextPanel({
  activeIssue,
  onClose,
  onToggleIssue,
}: PatientContextPanelProps) {
  const issueMetrics = buildIssueMetrics(activeIssue);

  return (
    <div className="dashboard-glass dashboard-fade-up h-full min-h-0 rounded-[1.45rem] p-3 shadow-[0_26px_60px_rgba(13,71,161,0.14)]">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.2rem] bg-white/36">
        <div className="flex justify-end px-1 pb-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/72 text-[color:var(--cs-primary)] transition hover:bg-white"
            aria-label="Đóng phần xem phác đồ"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="dashboard-scroll-area min-h-0 flex-1 overflow-y-auto px-1 pb-1">
          <div className="flex min-h-full flex-col gap-3">
            <PatientSummaryHeader patient={dashboardPatient} />

            <PanelCard className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex rounded-full bg-[color:rgba(13,71,161,0.08)] px-3 py-1 text-[12px] font-semibold text-[color:var(--cs-primary)]">
                    {activeIssue.chipLabel}
                  </span>
                  <h3 className="mt-3 text-[1.35rem] font-semibold leading-tight text-[color:var(--cs-heading)]">
                    {activeIssue.protocolTitle}
                  </h3>
                  <p className="mt-2 text-[1.02rem] leading-7 text-[color:var(--cs-text)]">
                    {activeIssue.protocolSummary}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleIssue(activeIssue.id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:rgba(13,71,161,0.06)] text-[color:var(--cs-primary)] transition hover:bg-[color:rgba(13,71,161,0.12)]"
                  aria-label={`Ẩn ${activeIssue.title}`}
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {activeIssue.protocolSteps.map((step, index) => (
                  <div
                    key={step}
                    className="dashboard-fade-up flex items-start gap-3 text-[1rem] leading-7 text-[color:var(--cs-text)]"
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    <CheckCircle2 className="mt-1 h-4.5 w-4.5 shrink-0 text-[color:var(--cs-teal)]" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </PanelCard>

            <PanelCard className="px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-[1.2rem] font-semibold text-[color:var(--cs-heading)]">
                    Biểu đồ chỉ số liên quan
                  </h4>
                  <p className="mt-1 text-[0.98rem] text-[color:var(--cs-text-soft)]">
                    Chỉ hiển thị các chỉ số phục vụ cho phác đồ đang mở.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {issueMetrics.map((metric) => {
                  const Icon = metric.icon;

                  return (
                    <div
                      key={metric.key}
                      className="dashboard-glass-soft rounded-[1.1rem] px-4 py-4"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`h-5 w-5 ${metric.iconColor}`} />
                        <p className="text-[1rem] font-semibold text-[color:var(--cs-heading)]">
                          {metric.title}
                        </p>
                      </div>

                      <div className="mt-4 flex items-end gap-2">
                        <span className="text-[2.1rem] font-semibold leading-none text-[color:var(--cs-heading)]">
                          {metric.value}
                        </span>
                        <span className="pb-1 text-[1rem] text-[color:var(--cs-text-soft)]">
                          {metric.unit}
                        </span>
                      </div>

                      <p className="mt-2 text-[0.98rem] font-medium text-[color:var(--cs-teal)]">
                        {metric.changeLabel}
                      </p>

                      <MiniSparkline stroke={metric.stroke} />
                    </div>
                  );
                })}
              </div>
            </PanelCard>
          </div>
        </div>
      </div>
    </div>
  );
}
