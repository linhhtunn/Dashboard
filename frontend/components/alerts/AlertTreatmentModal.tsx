"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import { getZoneLabel } from "@/lib/staff-ui";
import type { Alert, ShiftStaffMember } from "@/types";
import type { DoctorOption } from "@/lib/repositories/doctor.repository";

type AlertTreatmentModalProps = {
  alert: Alert;
  patientName?: string;
  floorNurses: ShiftStaffMember[];
  doctors: DoctorOption[];
  open: boolean;
  onClose: () => void;
  onSubmitTreat: (payload: {
    symptomsBefore: string;
    actionTaken: string;
    symptomsAfter: string;
    floorNurseId: string;
    doctorUserId: string;
    zoneCode: string;
    outcome: "completed" | "needs_follow_up";
    followUpNote?: string;
  }) => Promise<void>;
  onSubmitNoise: (description: string, doctorUserId: string) => Promise<void>;
  submitting?: boolean;
};

export function AlertTreatmentModal({
  alert,
  patientName,
  floorNurses,
  doctors,
  open,
  onClose,
  onSubmitTreat,
  onSubmitNoise,
  submitting = false,
}: AlertTreatmentModalProps) {
  const { locale } = useLocale();
  const ui = useClinicalUi();
  const [mode, setMode] = useState<"treat" | "noise">("treat");
  const [symptomsBefore, setSymptomsBefore] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [symptomsAfter, setSymptomsAfter] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [noiseDescription, setNoiseDescription] = useState("");
  const [floorNurseId, setFloorNurseId] = useState("");
  const [doctorUserId, setDoctorUserId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode("treat");
    setSymptomsBefore("");
    setActionTaken("");
    setSymptomsAfter("");
    setFollowUpNote("");
    setNoiseDescription("");
    setFloorNurseId(floorNurses[0]?.id ?? "");
    setDoctorUserId(doctors[0]?.user_id ?? "");
    setError(null);
  }, [open, alert.id, floorNurses, doctors]);

  if (!open) return null;

  const selectedNurse = floorNurses.find((member) => member.id === floorNurseId);

  async function handleTreat(outcome: "completed" | "needs_follow_up") {
    if (!symptomsBefore.trim() || !actionTaken.trim() || !symptomsAfter.trim()) {
      setError(ui.alerts.requiredFields);
      return;
    }
    if (!floorNurseId) {
      setError(ui.alerts.selectNurse);
      return;
    }
    if (!doctorUserId) {
      setError(locale === "vi" ? "Hãy chọn bác sĩ phụ trách." : "Select the assigned doctor.");
      return;
    }
    setError(null);
    try {
      await onSubmitTreat({
        symptomsBefore: symptomsBefore.trim(),
        actionTaken: actionTaken.trim(),
        symptomsAfter: symptomsAfter.trim(),
        floorNurseId,
        doctorUserId,
        zoneCode: selectedNurse?.zoneCode ?? "",
        outcome,
        followUpNote: outcome === "needs_follow_up" ? followUpNote.trim() : undefined,
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : ui.auth.genericError);
    }
  }

  async function handleNoise() {
    if (!noiseDescription.trim()) {
      setError(ui.alerts.requiredFields);
      return;
    }
    if (!doctorUserId) {
      setError(locale === "vi" ? "Hãy chọn bác sĩ phụ trách." : "Select the assigned doctor.");
      return;
    }
    setError(null);
    try {
      await onSubmitNoise(noiseDescription.trim(), doctorUserId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : ui.auth.genericError);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.45)] p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        className="dashboard-surface w-full max-w-lg rounded-[1.15rem] border border-white/50 p-4 shadow-[0_28px_60px_rgba(15,23,42,0.18)]"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[color:var(--cs-heading)]">
              {ui.alerts.treatmentModalTitle}
            </h2>
            <p className="mt-0.5 text-[11px] text-[color:var(--cs-text-soft)]">
              {patientName ?? alert.patientId} · {alert.id}
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

        <div className="mb-3 flex gap-1 rounded-[0.65rem] bg-white/50 p-1">
          {(["treat", "noise"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMode(tab)}
              className={[
                "flex-1 rounded-[0.55rem] px-2 py-1.5 text-[11px] font-semibold transition",
                mode === tab
                  ? "bg-white text-[color:var(--cs-primary)] shadow-sm"
                  : "text-[color:var(--cs-text-soft)]",
              ].join(" ")}
            >
              {tab === "treat" ? ui.alerts.treatmentTab : ui.alerts.noiseTab}
            </button>
          ))}
        </div>

        <label className="mb-3 block text-[11px] font-semibold text-[color:var(--cs-heading)]">
          {locale === "vi" ? "Bác sĩ phụ trách" : "Assigned doctor"}
          <select
            value={doctorUserId}
            onChange={(event) => setDoctorUserId(event.target.value)}
            className="dashboard-input mt-1 h-9 w-full rounded-[0.65rem] px-2 text-[11px]"
          >
            {doctors.length === 0 ? (
              <option value="">{locale === "vi" ? "Chưa có tài khoản bác sĩ" : "No doctor accounts"}</option>
            ) : null}
            {doctors.map((doctor) => (
              <option key={doctor.user_id} value={doctor.user_id}>
                {doctor.display_name}{doctor.email ? ` · ${doctor.email}` : ""}
              </option>
            ))}
          </select>
        </label>

        {mode === "treat" ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold text-[color:var(--cs-heading)]">
              {ui.alerts.symptomsBefore}
              <textarea
                value={symptomsBefore}
                onChange={(event) => setSymptomsBefore(event.target.value)}
                rows={2}
                className="dashboard-input mt-1 w-full rounded-[0.65rem] px-2.5 py-2 text-[11px]"
              />
            </label>
            <label className="block text-[11px] font-semibold text-[color:var(--cs-heading)]">
              {ui.alerts.actionTaken}
              <textarea
                value={actionTaken}
                onChange={(event) => setActionTaken(event.target.value)}
                rows={2}
                className="dashboard-input mt-1 w-full rounded-[0.65rem] px-2.5 py-2 text-[11px]"
              />
            </label>
            <label className="block text-[11px] font-semibold text-[color:var(--cs-heading)]">
              {ui.alerts.symptomsAfter}
              <textarea
                value={symptomsAfter}
                onChange={(event) => setSymptomsAfter(event.target.value)}
                rows={2}
                className="dashboard-input mt-1 w-full rounded-[0.65rem] px-2.5 py-2 text-[11px]"
              />
            </label>
            <label className="block text-[11px] font-semibold text-[color:var(--cs-heading)]">
              {ui.alerts.floorNurse}
              <select
                value={floorNurseId}
                onChange={(event) => setFloorNurseId(event.target.value)}
                className="dashboard-input mt-1 h-9 w-full rounded-[0.65rem] px-2 text-[11px]"
              >
                {floorNurses.map((nurse) => (
                  <option key={nurse.id} value={nurse.id}>
                    {nurse.name} · {getZoneLabel(nurse.zoneCode, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] font-semibold text-[color:var(--cs-heading)]">
              {ui.alerts.followUpNote}
              <textarea
                value={followUpNote}
                onChange={(event) => setFollowUpNote(event.target.value)}
                rows={2}
                className="dashboard-input mt-1 w-full rounded-[0.65rem] px-2.5 py-2 text-[11px]"
              />
            </label>
          </div>
        ) : (
          <label className="block text-[11px] font-semibold text-[color:var(--cs-heading)]">
            {ui.alerts.noiseDesc}
            <textarea
              value={noiseDescription}
              onChange={(event) => setNoiseDescription(event.target.value)}
              rows={4}
              className="dashboard-input mt-1 w-full rounded-[0.65rem] px-2.5 py-2 text-[11px]"
            />
          </label>
        )}

        {error ? (
          <p className="mt-2 text-[11px] text-[color:var(--cs-danger)]">{error}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="dashboard-input h-9 rounded-[0.65rem] px-3 text-[11px] font-semibold"
          >
            {ui.common.cancel}
          </button>
          {mode === "treat" ? (
            <>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleTreat("needs_follow_up")}
                className="dashboard-input h-9 rounded-[0.65rem] px-3 text-[11px] font-semibold text-[color:var(--cs-primary)]"
              >
                {ui.alerts.submitFollowUp}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleTreat("completed")}
                className="inline-flex h-9 items-center rounded-[0.65rem] bg-[linear-gradient(135deg,var(--cs-primary),var(--cs-teal))] px-3 text-[11px] font-semibold text-white"
              >
                {ui.alerts.submitTreat}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleNoise()}
              className="inline-flex h-9 items-center rounded-[0.65rem] bg-[linear-gradient(135deg,var(--cs-primary),var(--cs-teal))] px-3 text-[11px] font-semibold text-white"
            >
              {ui.alerts.submitNoise}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
