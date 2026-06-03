"use client";

import { PanelCard } from "@/components/common/PanelCard";
import { useLocale } from "@/components/providers/LocaleProvider";
import {
  getGenderLabel,
  getPatientStatusLabel,
  getWardLabel,
} from "@/lib/i18n";
import type { Patient } from "@/types";

type PatientSummaryHeaderProps = {
  patient: Patient;
};

export function PatientSummaryHeader({ patient }: PatientSummaryHeaderProps) {
  const { locale } = useLocale();
  const initials = patient.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <PanelCard className="px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(13,71,161,0.08)_0%,rgba(142,211,230,0.32)_100%)] text-[1.5rem] font-semibold text-[color:var(--cs-primary)]">
            {initials}
          </div>

          <div>
            <h3 className="text-[1.25rem] font-semibold leading-none text-[color:var(--cs-heading)]">
              {patient.name}
            </h3>

            <p className="mt-2 text-[0.9rem] text-[color:var(--cs-text-soft)]">
              MRN {patient.mrn} <span className="mx-1.5">•</span>
              {patient.age} {locale === "vi" ? "tuổi" : "years old"}{" "}
              <span className="mx-1.5">•</span>
              {getGenderLabel(patient.gender, locale)}
            </p>
            <p className="mt-1 text-[0.9rem] text-[color:var(--cs-text-soft)]">
              {getWardLabel(patient, locale)}
              {patient.bed ? (
                <>
                  <span className="mx-1.5">•</span>
                  {locale === "vi" ? "Giường" : "Bed"} {patient.bed}
                </>
              ) : null}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-flex items-center gap-2 rounded-[1rem] border border-[color:rgba(0,150,136,0.18)] bg-[color:rgba(0,150,136,0.08)] px-3.5 py-2 text-[color:var(--cs-teal)]">
            <span className="text-[0.8rem] font-semibold">
              {getPatientStatusLabel(patient.status, locale)}
            </span>
          </div>
          <p className="mt-2 text-[0.75rem] text-[color:var(--cs-text-soft)]">
            {locale === "vi" ? "Cập nhật gần đây" : "Recently updated"}
          </p>
        </div>
      </div>
    </PanelCard>
  );
}
