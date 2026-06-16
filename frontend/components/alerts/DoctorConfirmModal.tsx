"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { AlertTreatmentSummary } from "@/components/alerts/AlertTreatmentSummary";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import type { Alert } from "@/types";

type DoctorConfirmModalProps = {
  alert: Alert;
  patientName?: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (conclusion: string) => Promise<void>;
  submitting?: boolean;
};

export function DoctorConfirmModal({
  alert,
  patientName,
  open,
  onClose,
  onConfirm,
  submitting = false,
}: DoctorConfirmModalProps) {
  const ui = useClinicalUi();
  const [conclusion, setConclusion] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setConclusion("");
    setError(null);
  }, [open, alert.id]);

  if (!open) return null;

  async function handleSubmit() {
    if (!conclusion.trim()) {
      setError(ui.alerts.requiredFields);
      return;
    }
    setError(null);
    await onConfirm(conclusion.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.45)] p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        className="dashboard-surface w-full max-w-md rounded-[1.15rem] border border-white/50 p-4 shadow-[0_28px_60px_rgba(15,23,42,0.18)]"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[color:var(--cs-heading)]">
              {ui.alerts.doctorModalTitle}
            </h2>
            <p className="mt-0.5 text-[11px] text-[color:var(--cs-text-soft)]">
              {patientName ?? alert.patientId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="dashboard-input flex h-8 w-8 items-center justify-center rounded-[0.6rem]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-[0.75rem] border border-white/50 bg-white/40 px-3 py-2">
          <p className="text-[11px] font-semibold text-[color:var(--cs-heading)]">
            {ui.alerts.doctorSummary}
          </p>
          <div className="mt-2 max-h-[220px] overflow-y-auto pr-1">
            <AlertTreatmentSummary alert={alert} />
          </div>
        </div>

        <label className="mt-3 block text-[11px] font-semibold text-[color:var(--cs-heading)]">
          {ui.alerts.doctorConclusion}
          <textarea
            value={conclusion}
            onChange={(event) => setConclusion(event.target.value)}
            rows={3}
            className="dashboard-input mt-1 w-full rounded-[0.65rem] px-2.5 py-2 text-[11px]"
          />
        </label>

        {error ? (
          <p className="mt-2 text-[11px] text-[color:var(--cs-danger)]">{error}</p>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="dashboard-input h-9 rounded-[0.65rem] px-3 text-[11px] font-semibold"
          >
            {ui.common.cancel}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            className="inline-flex h-9 items-center rounded-[0.65rem] bg-[linear-gradient(135deg,var(--cs-primary),var(--cs-teal))] px-3 text-[11px] font-semibold text-white"
          >
            {ui.alerts.doctorSubmit}
          </button>
        </div>
      </div>
    </div>
  );
}
