import Link from "next/link";

import { useLocale } from "@/components/providers/LocaleProvider";
import {
  formatRelativeUpdate,
  getGenderLabel,
  getPatientStatusLabel,
  getSymptomLabel,
  getWardLabel,
} from "@/lib/i18n";
import type { Patient, PatientStatus, VitalSignalSample } from "@/types";

export type PatientListItem = {
  patient: Patient;
  latestVital: VitalSignalSample | null;
  openAlertCount: number;
};

type PatientCardProps = {
  item: PatientListItem;
};

const statusClasses: Record<PatientStatus, string> = {
  healthy:
    "border-[color:rgba(0,150,136,0.18)] bg-[color:rgba(0,150,136,0.1)] text-[color:var(--cs-teal)]",
  at_risk:
    "border-[color:rgba(245,179,0,0.22)] bg-[color:rgba(245,179,0,0.14)] text-[color:#9a6700]",
  critical:
    "border-[color:rgba(229,72,77,0.22)] bg-[color:rgba(229,72,77,0.12)] text-[color:var(--cs-danger)]",
  recent_symptom:
    "border-[color:rgba(13,71,161,0.18)] bg-[color:rgba(13,71,161,0.1)] text-[color:var(--cs-primary)]",
};

function formatBloodPressure(vital: VitalSignalSample | null) {
  if (!vital?.vitals.systolicBp || !vital.vitals.diastolicBp) return "--/--";
  return `${vital.vitals.systolicBp}/${vital.vitals.diastolicBp}`;
}

export function PatientCard({ item }: PatientCardProps) {
  const { locale } = useLocale();
  const { patient, latestVital, openAlertCount } = item;
  const firstSymptom =
    patient.recentSymptomCodes[0] &&
    getSymptomLabel(patient.recentSymptomCodes[0], locale);

  return (
    <article className="dashboard-surface rounded-[1.4rem] p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.9fr)_auto] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="truncate text-[1.1rem] font-semibold text-[color:var(--cs-heading)]">
              {patient.name}
            </h3>
            <span
              className={[
                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                statusClasses[patient.status],
              ].join(" ")}
            >
              {getPatientStatusLabel(patient.status, locale)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[color:var(--cs-text-soft)]">
            <span>MRN {patient.mrn}</span>
            <span>•</span>
            <span>
              {patient.age} {locale === "vi" ? "tuổi" : "years old"} •{" "}
              {getGenderLabel(patient.gender, locale)}
            </span>
            <span>•</span>
            <span>{getWardLabel(patient, locale)}</span>
            {patient.bed ? (
              <>
                <span>•</span>
                <span>
                  {locale === "vi" ? "Giường" : "Bed"} {patient.bed}
                </span>
              </>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-sm text-[color:var(--cs-text)]">
            <span className="rounded-full bg-white/72 px-3 py-1.5">
              {locale === "vi" ? "Nhịp tim" : "Heart rate"}:{" "}
              <strong className="text-[color:var(--cs-heading)]">
                {latestVital?.vitals.heartRate ?? "--"} bpm
              </strong>
            </span>
            <span className="rounded-full bg-white/72 px-3 py-1.5">
              SpO₂:{" "}
              <strong className="text-[color:var(--cs-heading)]">
                {latestVital?.vitals.spo2 ?? "--"}%
              </strong>
            </span>
            <span className="rounded-full bg-white/72 px-3 py-1.5">
              {locale === "vi" ? "Huyết áp" : "Blood pressure"}:{" "}
              <strong className="text-[color:var(--cs-heading)]">
                {formatBloodPressure(latestVital)} mmHg
              </strong>
            </span>
          </div>
        </div>

        <div className="grid gap-2 rounded-[1.15rem] border border-white/50 bg-white/50 px-4 py-3 text-sm text-[color:var(--cs-text)]">
          <p className="font-medium text-[color:var(--cs-heading)]">
            {openAlertCount > 0
              ? locale === "vi"
                ? `${openAlertCount} cảnh báo đang mở`
                : `${openAlertCount} open alert${openAlertCount === 1 ? "" : "s"}`
              : locale === "vi"
                ? "Không có cảnh báo đang mở"
                : "No open alerts"}
          </p>
          <p>
            {firstSymptom
              ? locale === "vi"
                ? `Triệu chứng gần nhất: ${firstSymptom}`
                : `Latest symptom: ${firstSymptom}`
              : locale === "vi"
                ? "Chưa ghi nhận triệu chứng mới"
                : "No newly recorded symptoms"}
          </p>
          <p>{formatRelativeUpdate(patient.lastUpdated, locale)}</p>
        </div>

        <div className="flex items-center justify-end">
          <Link
            href={`/patients/${patient.id}`}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(13,71,161,0.96),rgba(0,150,136,0.78))] px-4 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(13,71,161,0.18)] transition hover:brightness-105"
          >
            {locale === "vi" ? "Xem hồ sơ" : "View record"}
          </Link>
        </div>
      </div>
    </article>
  );
}
