"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import { getZoneLabel } from "@/lib/staff-ui";
import type { Alert } from "@/types";

type AlertTreatmentSummaryProps = {
  alert: Alert;
};

export function AlertTreatmentSummary({ alert }: AlertTreatmentSummaryProps) {
  const { locale } = useLocale();
  const ui = useClinicalUi();

  if (alert.workflowStatus === "noise" && alert.noiseNote) {
    return (
      <div className="space-y-1.5 text-[11px] text-[color:var(--cs-text)]">
        <p className="font-semibold text-[color:var(--cs-heading)]">
          {ui.alerts.noiseTab}
        </p>
        <p className="leading-5">{alert.noiseNote}</p>
      </div>
    );
  }

  if (alert.treatment) {
    const { treatment } = alert;
    return (
      <div className="space-y-2 text-[11px] text-[color:var(--cs-text)]">
        <p className="font-semibold text-[color:var(--cs-heading)]">
          {ui.alerts.treatmentTab}
        </p>
        <div>
          <p className="font-semibold text-[color:var(--cs-heading)]">
            {ui.alerts.symptomsBefore}
          </p>
          <p className="mt-0.5 leading-5">{treatment.symptomsBefore}</p>
        </div>
        <div>
          <p className="font-semibold text-[color:var(--cs-heading)]">
            {ui.alerts.actionTaken}
          </p>
          <p className="mt-0.5 leading-5">{treatment.actionTaken}</p>
        </div>
        <div>
          <p className="font-semibold text-[color:var(--cs-heading)]">
            {ui.alerts.symptomsAfter}
          </p>
          <p className="mt-0.5 leading-5">{treatment.symptomsAfter}</p>
        </div>
        {treatment.followUpNote ? (
          <div>
            <p className="font-semibold text-[color:var(--cs-heading)]">
              {ui.alerts.followUpNote}
            </p>
            <p className="mt-0.5 leading-5">{treatment.followUpNote}</p>
          </div>
        ) : null}
        {treatment.floorNurseName ? (
          <p className="text-[10px] text-[color:var(--cs-text-soft)]">
            {ui.alerts.floorNurse}: {treatment.floorNurseName}
            {treatment.zoneCode
              ? ` · ${getZoneLabel(treatment.zoneCode, locale)}`
              : ""}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <p className="text-[11px] leading-5 text-[color:var(--cs-text-soft)]">
      {ui.alerts.doctorNoNotes}
    </p>
  );
}
