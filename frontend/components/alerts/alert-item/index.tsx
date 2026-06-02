"use client";

import { useState } from "react";
import type { Alert, AlertSeverity, VitalMetric } from "@/types";

type AlertItemProps = {
  alert: Alert;
};

const severityCopy: Record<
  AlertSeverity,
  {
    label: string;
    classes: string;
    dot: string;
  }
> = {
  info: {
    label: "Needs monitoring",
    classes: "border-slate-200 bg-slate-50 text-slate-600",
    dot: "bg-slate-400",
  },
  warning: {
    label: "Attention",
    classes: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  critical: {
    label: "High priority",
    classes: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
};

const metricLabels: Partial<Record<VitalMetric, string>> = {
  heart_rate: "Heart rate",
  respiratory_rate: "Respiratory rate",
  blood_pressure: "Blood pressure",
  spo2: "Oxygen saturation",
  glucose: "Glucose",
  motion: "Motion signal",
};

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMinutes = Math.max(
    0,
    Math.round((now.getTime() - date.getTime()) / 60000),
  );

  if (diffMinutes > 0 && diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const time = new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  if (date.toDateString() === now.toDateString()) {
    return `Today · ${time}`;
  }

  return time;
}

function formatEvidence(alert: Alert) {
  if (alert.evidence.length === 0) {
    return ["Dau hieu bat thuong can theo doi them."];
  }

  return alert.evidence.map((evidence) => {
    const metricName = evidence.metric
      ? metricLabels[evidence.metric] ?? "Health signal"
      : "Health signal";
    const value =
      evidence.value !== undefined
        ? ` at ${evidence.value}${evidence.unit ? ` ${evidence.unit}` : ""}`
        : "";

    if (alert.type === "high_blood_pressure" || alert.type === "low_blood_pressure") {
      return "Blood pressure outside recent baseline.";
    }

    return `${metricName} shows abnormal signs${value}; needs monitoring.`;
  });
}

export function AlertItem({ alert }: AlertItemProps) {
  const [acknowledged, setAcknowledged] = useState(alert.acknowledged);
  const severity = severityCopy[alert.severity];

  return (
    <article className="rounded-lg border border-border bg-panel p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                severity.classes,
              ].join(" ")}
            >
              <span className={["h-2 w-2 rounded-full", severity.dot].join(" ")} />
              {severity.label}
            </span>
            <span className="text-xs text-text-body">
              {formatTimestamp(alert.timestamp)}
            </span>
          </div>

          <p className="text-sm font-medium text-text-strong">
            {alert.message}
          </p>

          <div className="space-y-1">
            {formatEvidence(alert).map((evidence) => (
              <p key={evidence} className="text-sm text-text-body">
                {evidence}
              </p>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={acknowledged}
          onClick={() => setAcknowledged(true)}
          className="h-10 shrink-0 rounded-md border border-primary/20 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:border-border disabled:text-text-body disabled:opacity-60"
        >
          {acknowledged ? "Acknowledged" : "Acknowledge"}
        </button>
      </div>
    </article>
  );
}
