"use client";

import type { ReactNode } from "react";
import {
  Activity,
  ClipboardList,
  HeartPulse,
  Ruler,
  UserRound,
} from "lucide-react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { getConditionLabel } from "@/lib/i18n/domain";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import type { Patient, PatientBaselineSignals } from "@/types";

type PatientDbProfilePanelProps = {
  patient: Patient;
};

function formatCodeLabel(value: string, locale: "vi" | "en"): string {
  const labels: Record<string, { vi: string; en: string }> = {
    elderly: { vi: "Cao tuổi", en: "Elderly" },
    adult: { vi: "Người lớn", en: "Adult" },
    low_activity: { vi: "Ít vận động", en: "Low activity" },
    moderate_activity: { vi: "Vận động vừa", en: "Moderate activity" },
    high_activity: { vi: "Vận động nhiều", en: "High activity" },
    low: { vi: "Thấp", en: "Low" },
    moderate: { vi: "Trung bình", en: "Moderate" },
    high: { vi: "Cao", en: "High" },
    none: { vi: "Không", en: "None" },
    active: { vi: "Đang theo dõi", en: "Active" },
    sinus_rhythm: { vi: "Nhịp xoang", en: "Sinus rhythm" },
    CRITICAL: { vi: "Nguy kịch", en: "Critical" },
    WARNING: { vi: "Cảnh báo", en: "Warning" },
    NORMAL: { vi: "Bình thường", en: "Normal" },
  };

  if (labels[value]) return labels[value][locale];
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value: string | null | undefined, locale: "vi" | "en") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ProfileSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-white/45 pt-2 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-[color:var(--cs-primary)]" />
        <p className="text-[7px] font-semibold uppercase tracking-[0.14em] text-[color:var(--cs-teal)]">
          {title}
        </p>
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function FieldGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[8px] font-semibold uppercase tracking-wide text-[color:var(--cs-text-soft)]">
            {item.label}
          </dt>
          <dd className="mt-0.5 text-[10px] font-medium text-[color:var(--cs-heading)]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function BaselineGrid({
  signals,
  locale,
  ui,
}: {
  signals: PatientBaselineSignals;
  locale: "vi" | "en";
  ui: ReturnType<typeof useClinicalUi>;
}) {
  const items = [
    { label: ui.patientDetail.baselineHr, value: signals.heartRate, unit: "bpm" },
    { label: ui.patientDetail.baselineRr, value: signals.respiratoryRate, unit: "rpm" },
    { label: ui.patientDetail.baselineSpo2, value: signals.spo2, unit: "%" },
    {
      label: ui.patientDetail.baselineBp,
      value:
        signals.systolicBp !== undefined && signals.diastolicBp !== undefined
          ? `${signals.systolicBp}/${signals.diastolicBp}`
          : undefined,
      unit: "mmHg",
    },
    { label: ui.patientDetail.baselineHrv, value: signals.hrvRmssdMorning, unit: "ms" },
    { label: ui.patientDetail.baselineStress, value: signals.stressScore, unit: "" },
    {
      label: ui.patientDetail.baselineEcg,
      value: signals.ecgRhythm ? formatCodeLabel(signals.ecgRhythm, locale) : undefined,
      unit: "",
    },
  ].filter((item) => item.value !== undefined);

  if (!items.length) {
    return (
      <p className="text-[9px] text-[color:var(--cs-text-soft)]">{ui.patientDetail.noBaseline}</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[0.7rem] border border-white/50 bg-white/42 px-2 py-1.5"
        >
          <p className="text-[8px] font-semibold uppercase tracking-wide text-[color:var(--cs-text-soft)]">
            {item.label}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-[color:var(--cs-heading)]">
            {item.value}
            {item.unit ? (
              <span className="ml-1 text-[9px] font-normal text-[color:var(--cs-text-soft)]">
                {item.unit}
              </span>
            ) : null}
          </p>
        </div>
      ))}
    </div>
  );
}

export function PatientDbProfilePanel({ patient }: PatientDbProfilePanelProps) {
  const { locale } = useLocale();
  const ui = useClinicalUi();
  const profile = patient.dbProfile;

  if (!profile) return null;

  return (
    <section className="dashboard-surface shrink-0 rounded-[1.15rem] p-2">
      <div className="space-y-2">
        <ProfileSection icon={UserRound} title={ui.patientDetail.demographics}>
          <FieldGrid
            items={[
              {
                label: ui.patientDetail.ageGroup,
                value: profile.ageGroup
                  ? formatCodeLabel(profile.ageGroup, locale)
                  : "—",
              },
              {
                label: ui.patientDetail.pregnancyStatus,
                value: profile.pregnancyStatus
                  ? formatCodeLabel(profile.pregnancyStatus, locale)
                  : "—",
              },
              {
                label: ui.patientDetail.height,
                value: profile.heightCm != null ? `${profile.heightCm} cm` : "—",
              },
              {
                label: ui.patientDetail.weight,
                value: profile.weightKg != null ? `${profile.weightKg} kg` : "—",
              },
              {
                label: ui.patientDetail.mimicSubjectId,
                value:
                  profile.mimicSubjectId != null ? String(profile.mimicSubjectId) : "—",
              },
              {
                label: ui.patientDetail.recordId,
                value: patient.id,
              },
            ]}
          />
        </ProfileSection>

        <ProfileSection icon={HeartPulse} title={ui.patientDetail.clinicalStatus}>
          <FieldGrid
            items={[
              {
                label: ui.patientDetail.healthStatus,
                value: profile.healthStatus
                  ? formatCodeLabel(profile.healthStatus, locale)
                  : "—",
              },
              {
                label: ui.patientDetail.recordStatus,
                value: profile.recordStatus
                  ? formatCodeLabel(profile.recordStatus, locale)
                  : "—",
              },
            ]}
          />
        </ProfileSection>

        <ProfileSection icon={Activity} title={ui.patientDetail.lifestyleActivity}>
          <FieldGrid
            items={[
              {
                label: ui.patientDetail.lifestyle,
                value: profile.lifestyle
                  ? formatCodeLabel(profile.lifestyle, locale)
                  : "—",
              },
              {
                label: ui.patientDetail.activityLevel,
                value: profile.activityLevel
                  ? formatCodeLabel(profile.activityLevel, locale)
                  : "—",
              },
            ]}
          />
        </ProfileSection>

        <ProfileSection icon={ClipboardList} title={ui.patientDetail.medicalHistory}>
          <p className="text-[10px] leading-5 text-[color:var(--cs-text)]">
            {profile.medicalHistory || ui.patientDetail.noMedicalHistory}
          </p>
        </ProfileSection>

        {profile.riskFactors.length > 0 ? (
          <ProfileSection icon={Ruler} title={ui.patientDetail.riskFactors}>
            <div className="flex flex-wrap gap-1">
              {profile.riskFactors.map((code) => (
                <span
                  key={code}
                  className="rounded-full border border-[color:rgba(245,179,0,0.28)] bg-[color:rgba(245,179,0,0.1)] px-2 py-0.5 text-[9px] font-semibold text-[color:#8a6100]"
                >
                  {getConditionLabel(code, locale)}
                </span>
              ))}
            </div>
          </ProfileSection>
        ) : null}

        {profile.baselineSignals ? (
          <ProfileSection icon={HeartPulse} title={ui.patientDetail.baselineSignals}>
            <BaselineGrid signals={profile.baselineSignals} locale={locale} ui={ui} />
          </ProfileSection>
        ) : null}

        <ProfileSection icon={ClipboardList} title={ui.patientDetail.recordTimestamps}>
          <FieldGrid
            items={[
              {
                label: ui.patientDetail.createdAt,
                value: formatDateTime(profile.createdAt, locale),
              },
              {
                label: ui.patientDetail.updatedAt,
                value: formatDateTime(patient.lastUpdated, locale),
              },
            ]}
          />
        </ProfileSection>
      </div>
    </section>
  );
}
