"use client";

import { Activity, HeartPulse, ShieldCheck, X } from "lucide-react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { PanelCard } from "@/components/common/PanelCard";
import {
  dashboardMetrics,
  dashboardPatient,
  type DashboardIssue,
} from "@/components/dashboard/dashboard-demo-data";
import { PatientSummaryHeader } from "@/components/dashboard/PatientSummaryHeader";
import { getMetricLabel, localizeText } from "@/lib/i18n";

type PatientContextPanelProps = {
  activeIssue: DashboardIssue;
  onClose: () => void;
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
        icon: HeartPulse,
        iconColor: "text-[color:#EF4444]",
        stroke: "#0D47A1",
      };
    case "hrv_rmssd":
      return {
        icon: Activity,
        iconColor: "text-[color:#2563EB]",
        stroke: "#009688",
      };
    case "spo2":
      return {
        icon: ShieldCheck,
        iconColor: "text-[color:var(--cs-teal)]",
        stroke: "#009688",
      };
    case "systolic_bp":
      return {
        icon: ShieldCheck,
        iconColor: "text-[color:var(--cs-gold)]",
        stroke: "#F5B300",
      };
    case "diastolic_bp":
      return {
        icon: ShieldCheck,
        iconColor: "text-[color:#FB923C]",
        stroke: "#F59E0B",
      };
    default:
      return {
        icon: Activity,
        iconColor: "text-[color:var(--cs-primary)]",
        stroke: "#0D47A1",
      };
  }
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
}: PatientContextPanelProps) {
  const { locale } = useLocale();
  const issueMetrics = dashboardMetrics
    .filter((metric) => activeIssue.metricKeys.includes(metric.metric))
    .map((metric) => {
      const meta = getMetricMeta(metric.metric);

      return {
        key: metric.metric,
        title: getMetricLabel(metric.metric, locale),
        value: `${metric.currentValue}`,
        unit: metric.unit,
        changeLabel:
          locale === "vi"
            ? `${Math.abs(metric.changePct ?? 0)}% so với 15 phút trước`
            : `${Math.abs(metric.changePct ?? 0)}% vs 15 minutes ago`,
        icon: meta.icon,
        iconColor: meta.iconColor,
        stroke: meta.stroke,
      } satisfies IssueDisplayMetric;
    });

  return (
    <div className="dashboard-glass dashboard-fade-up h-full min-h-0 rounded-[1.45rem] p-3 shadow-[0_26px_60px_rgba(13,71,161,0.14)]">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.2rem] bg-white/36">
        <div className="flex justify-end px-1 pb-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/72 text-[color:var(--cs-primary)] transition hover:bg-white"
            aria-label={
              locale === "vi" ? "Đóng phần xem phác đồ" : "Close protocol view"
            }
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="dashboard-scroll-area min-h-0 flex-1 overflow-y-auto px-1 pb-1">
          <div className="flex min-h-full flex-col gap-3">
            <PatientSummaryHeader patient={dashboardPatient} />

            <PanelCard className="px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-[1.2rem] font-semibold text-[color:var(--cs-heading)]">
                    {locale === "vi" ? "Biểu đồ chỉ số" : "Metric chart"}{" "}
                    {issueMetrics.map((metric) => metric.title).join(", ")}
                  </h4>
                  <p className="mt-2 text-sm text-[color:var(--cs-text-soft)]">
                    {localizeText(activeIssue.protocolSummary, locale)}
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
