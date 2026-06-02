import { Activity, HeartPulse, ShieldCheck } from "lucide-react";

import { PanelCard } from "@/components/common/PanelCard";
import type { MetricSummary } from "@/types";

type VitalsOverviewCardProps = {
  metrics: MetricSummary[];
};

type VitalsDisplayMetric = {
  key: "heart_rate" | "hrv_rmssd" | "blood_pressure";
  title: string;
  icon: typeof HeartPulse;
  iconColor: string;
  value: string;
  unit: string;
  changeLabel: string;
  trendColor: string;
  sparkStroke: string;
};

function buildVitalsDisplay(metrics: MetricSummary[]): VitalsDisplayMetric[] {
  const heartRate = metrics.find((item) => item.metric === "heart_rate");
  const hrvRmssd = metrics.find((item) => item.metric === "hrv_rmssd");
  const systolic = metrics.find((item) => item.metric === "systolic_bp");
  const diastolic = metrics.find((item) => item.metric === "diastolic_bp");

  return [
    {
      key: "heart_rate",
      title: "Nhip tim",
      icon: HeartPulse,
      iconColor: "text-[color:#EF4444]",
      value: `${heartRate?.currentValue ?? "--"}`,
      unit: heartRate?.unit ?? "bpm",
      changeLabel: `${Math.abs(heartRate?.changePct ?? 0)}% so voi 15 phut truoc`,
      trendColor: "text-[color:var(--cs-teal)]",
      sparkStroke: "#0D47A1",
    },
    {
      key: "hrv_rmssd",
      title: "HRV - RMSSD",
      icon: Activity,
      iconColor: "text-[color:#2563EB]",
      value: `${hrvRmssd?.currentValue ?? "--"}`,
      unit: hrvRmssd?.unit ?? "ms",
      changeLabel: `${Math.abs(hrvRmssd?.changePct ?? 0)}% so voi 15 phut truoc`,
      trendColor: "text-[color:var(--cs-teal)]",
      sparkStroke: "#009688",
    },
    {
      key: "blood_pressure",
      title: "Huyet ap",
      icon: ShieldCheck,
      iconColor: "text-[color:var(--cs-gold)]",
      value:
        systolic && diastolic
          ? `${systolic.currentValue}/${diastolic.currentValue}`
          : "--/--",
      unit: "mmHg",
      changeLabel: `${Math.abs(systolic?.changePct ?? 0)}% so voi 15 phut truoc`,
      trendColor: "text-[color:var(--cs-teal)]",
      sparkStroke: "#F5B300",
    },
  ];
}

function MiniSparkline({ stroke }: { stroke: string }) {
  return (
    <svg
      viewBox="0 0 220 90"
      className="mt-4 h-[90px] w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 58 C20 62, 28 46, 46 50 C64 54, 74 42, 92 44 C110 46, 120 62, 138 60 C156 58, 166 48, 184 50 C198 52, 208 56, 220 54"
        fill="none"
        stroke={stroke}
        strokeWidth="2.75"
        strokeLinecap="round"
      />
      <line x1="0" y1="88" x2="220" y2="88" stroke="rgba(217,226,236,0.9)" />
      <line x1="0" y1="16" x2="220" y2="16" stroke="rgba(217,226,236,0.5)" strokeDasharray="4 5" />
    </svg>
  );
}

export function VitalsOverviewCard({ metrics }: VitalsOverviewCardProps) {
  const displayMetrics = buildVitalsDisplay(metrics);

  return (
    <PanelCard className="px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[1.1rem] font-semibold text-[color:var(--cs-heading)]">
            Xu huong chi so sinh ton
          </p>
          <p className="mt-1 text-sm text-[color:var(--cs-text-soft)]">
            Anh chup nhanh cua cua so theo doi 15 phut gan nhat.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-[color:rgba(0,150,136,0.18)] bg-[color:rgba(0,150,136,0.08)] px-3 py-1 text-sm text-[color:var(--cs-teal)]">
          <ShieldCheck className="h-4 w-4" />
          <span className="font-medium">On dinh trong 15 phut qua</span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        {displayMetrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.key}
              className="dashboard-glass-soft rounded-[1.2rem] px-4 py-4"
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${metric.iconColor}`} />
                <p className="text-sm font-medium text-[color:var(--cs-heading)]">
                  {metric.title}
                </p>
              </div>

              <div className="mt-4 flex items-end gap-2">
                <span className="text-[2.15rem] font-semibold leading-none text-[color:var(--cs-heading)]">
                  {metric.value}
                </span>
                <span className="pb-1 text-sm text-[color:var(--cs-text-soft)]">
                  {metric.unit}
                </span>
              </div>

              <p className={`mt-3 text-sm ${metric.trendColor}`}>
                {metric.changeLabel}
              </p>

              <MiniSparkline stroke={metric.sparkStroke} />
            </div>
          );
        })}
      </div>
    </PanelCard>
  );
}
