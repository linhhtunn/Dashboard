"use client";

import { BellRing } from "lucide-react";

import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import type { Alert } from "@/types";

type DoctorConfirmBannerProps = {
  pendingAlerts: Alert[];
  patients: Record<string, { name: string } | undefined>;
  onConfirm: (alert: Alert) => void;
};

export function DoctorConfirmBanner({
  pendingAlerts,
  patients,
  onConfirm,
}: DoctorConfirmBannerProps) {
  const ui = useClinicalUi();
  if (!pendingAlerts.length) return null;

  return (
    <div className="shrink-0 rounded-[1rem] border border-[color:rgba(245,179,0,0.35)] bg-[linear-gradient(135deg,rgba(245,179,0,0.12),rgba(255,255,255,0.55))] px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-[color:#8a6100]">
          <BellRing className="h-4 w-4" />
          {ui.alerts.doctorBannerTitle} ({pendingAlerts.length})
        </div>
        <div className="flex flex-wrap gap-1.5">
          {pendingAlerts.slice(0, 4).map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => onConfirm(alert)}
              className="dashboard-input rounded-[0.6rem] px-2.5 py-1 text-[10px] font-semibold text-[color:var(--cs-primary)]"
            >
              {patients[alert.patientId]?.name ?? alert.patientId} ·{" "}
              {ui.alerts.doctorBannerAction}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
