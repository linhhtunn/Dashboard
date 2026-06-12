"use client";

import { Clock3, Pill, Stethoscope } from "lucide-react";

import { useLocale } from "@/components/providers/LocaleProvider";
import {
  formatMedicationDueTime,
  formatShortClockTime,
  getConditionLabel,
  localizeText,
} from "@/lib/i18n/domain";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import type { MedicationCycle, Patient } from "@/types";

type PatientClinicalProfilePanelProps = {
  patient: Patient;
};

function sortMedications(items: MedicationCycle[]) {
  return [...items].sort((left, right) => {
    if (!left.nextDoseAt && !right.nextDoseAt) return 0;
    if (!left.nextDoseAt) return 1;
    if (!right.nextDoseAt) return -1;
    return new Date(left.nextDoseAt).getTime() - new Date(right.nextDoseAt).getTime();
  });
}

export function PatientClinicalProfilePanel({
  patient,
}: PatientClinicalProfilePanelProps) {
  const { locale } = useLocale();
  const ui = useClinicalUi();
  const conditions = patient.underlyingConditionCodes;
  const medications = sortMedications(patient.medicationCycle);

  return (
    <section className="dashboard-surface shrink-0 rounded-[1.15rem] p-2">
      <div className="space-y-2">
        <div>
          <div className="flex items-center gap-1.5">
            <Stethoscope className="h-3.5 w-3.5 text-[color:var(--cs-primary)]" />
            <p className="text-[7px] font-semibold uppercase tracking-[0.14em] text-[color:var(--cs-teal)]">
              {ui.patientDetail.underlyingConditions}
            </p>
          </div>
          {conditions.length ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {conditions.map((code) => (
                <span
                  key={code}
                  className="rounded-full border border-[color:rgba(13,71,161,0.18)] bg-[color:rgba(13,71,161,0.08)] px-2 py-0.5 text-[9px] font-semibold text-[color:var(--cs-primary)]"
                >
                  {getConditionLabel(code, locale)}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1.5 text-[9px] text-[color:var(--cs-text-soft)]">
              {ui.patientDetail.noConditions}
            </p>
          )}
        </div>

        <div className="border-t border-white/45 pt-2">
          <div className="flex items-center gap-1.5">
            <Pill className="h-3.5 w-3.5 text-[color:var(--cs-teal)]" />
            <p className="text-[7px] font-semibold uppercase tracking-[0.14em] text-[color:var(--cs-teal)]">
              {ui.patientDetail.medicationSchedule}
            </p>
          </div>

          {medications.length ? (
            <ul className="mt-1.5 space-y-1.5">
              {medications.map((item, index) => {
                const scheduleLabel = localizeText(item.schedule, locale);
                const dueLabel = formatMedicationDueTime(item.nextDoseAt, locale);
                const lastTakenLabel = item.lastTakenAt
                  ? formatShortClockTime(item.lastTakenAt, locale)
                  : null;

                return (
                  <li
                    key={`${localizeText(item.medication, locale)}-${index}`}
                    className="rounded-[0.7rem] border border-white/50 bg-white/42 px-2 py-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-semibold text-[color:var(--cs-heading)]">
                          {localizeText(item.medication, locale)}
                        </p>
                        <p className="text-[9px] text-[color:var(--cs-text-soft)]">
                          {item.dosage} · {scheduleLabel}
                        </p>
                      </div>
                      {dueLabel ? (
                        <span className="shrink-0 rounded-full bg-[color:rgba(0,150,136,0.12)] px-1.5 py-0.5 text-[8px] font-semibold text-[color:var(--cs-teal)]">
                          {ui.patientDetail.nextDose}
                        </span>
                      ) : null}
                    </div>
                    {dueLabel ? (
                      <p className="mt-1 inline-flex items-center gap-1 text-[9px] font-medium text-[color:var(--cs-heading)]">
                        <Clock3 className="h-3 w-3 text-[color:var(--cs-primary)]" />
                        {dueLabel}
                      </p>
                    ) : (
                      <p className="mt-1 text-[9px] text-[color:var(--cs-text-soft)]">
                        {ui.patientDetail.asOrdered}
                      </p>
                    )}
                    {lastTakenLabel ? (
                      <p className="mt-0.5 text-[8px] text-[color:var(--cs-text-soft)]">
                        {ui.patientDetail.lastTaken}: {lastTakenLabel}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-1.5 text-[9px] text-[color:var(--cs-text-soft)]">
              {ui.patientDetail.noMedications}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
