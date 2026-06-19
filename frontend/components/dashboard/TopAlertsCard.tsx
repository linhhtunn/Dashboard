import { AlertCircle, AlertTriangle, ChevronRight, Info } from "lucide-react";

import { PanelCard } from "@/components/common/PanelCard";
import type { Alert } from "@/types";

type TopAlertsCardProps = {
  alerts: Alert[];
};

function getAlertPresentation(alert: Alert) {
  switch (alert.severity) {
    case "critical":
      return {
        icon: AlertCircle,
        rowTint: "bg-[color:rgba(229,72,77,0.04)]",
        iconColor: "text-[color:var(--cs-danger)]",
        badge: "High",
        badgeClass:
          "border-[color:rgba(229,72,77,0.18)] bg-[color:rgba(229,72,77,0.08)] text-[color:var(--cs-danger)]",
      };
    case "warning":
      return {
        icon: AlertTriangle,
        rowTint: "bg-[color:rgba(245,179,0,0.05)]",
        iconColor: "text-[color:var(--cs-gold)]",
        badge: "Medium",
        badgeClass:
          "border-[color:rgba(245,179,0,0.2)] bg-[color:rgba(245,179,0,0.08)] text-[color:#A16207]",
      };
    default:
      return {
        icon: Info,
        rowTint: "bg-[color:rgba(13,71,161,0.04)]",
        iconColor: "text-[color:var(--cs-primary)]",
        badge: "Info",
        badgeClass:
          "border-[color:rgba(13,71,161,0.16)] bg-[color:rgba(13,71,161,0.06)] text-[color:var(--cs-primary)]",
      };
  }
}

function getAlertTitle(type: Alert["type"]) {
  switch (type) {
    case "deterioration_risk":
      return "High Sepsis Risk";
    case "high_blood_pressure":
      return "Deterioration Detected";
    case "low_oxygen":
      return "Low Oxygen Saturation";
    default:
      return "Clinical Alert";
  }
}

function getAlertMeta(alert: Alert) {
  if (alert.type === "low_oxygen") return "SpO2 92%";
  if (alert.score !== undefined) return `Score ${alert.score}`;
  return "Monitoring required";
}

function getTimestampLabel(index: number) {
  if (index === 0) return "10 min ago";
  if (index === 1) return "28 min ago";
  return "1 hr ago";
}

export function TopAlertsCard({ alerts }: TopAlertsCardProps) {
  return (
    <PanelCard className="px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-[1.1rem] font-semibold text-[color:var(--cs-heading)]">
            Top Alerts
          </p>
          <span className="flex h-7 min-w-[28px] items-center justify-center rounded-full bg-[color:var(--cs-danger)] px-2 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(229,72,77,0.22)]">
            {alerts.length}
          </span>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--cs-primary)]"
        >
          View all alerts
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {alerts.map((alert, index) => {
          const presentation = getAlertPresentation(alert);
          const Icon = presentation.icon;

          return (
            <div
              key={alert.id}
              className={`flex items-center justify-between gap-3 rounded-[1.1rem] border border-[color:var(--cs-border)] px-4 py-3 ${presentation.rowTint}`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${presentation.iconColor}`} />
                <div>
                  <p className="text-sm font-medium text-[color:var(--cs-heading)]">
                    {getAlertTitle(alert.type)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${presentation.badgeClass}`}
                >
                  {presentation.badge}
                </span>
                <span className="text-sm text-[color:var(--cs-text-soft)]">
                  {getAlertMeta(alert)}
                </span>
                <span className="text-sm text-[color:var(--cs-text-soft)]">
                  {getTimestampLabel(index)}
                </span>
                <ChevronRight className="h-4 w-4 text-[color:var(--cs-text-soft)]" />
              </div>
            </div>
          );
        })}
      </div>
    </PanelCard>
  );
}
