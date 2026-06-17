"use client";

import { ArrowDown, ArrowRight, ArrowUp, BellRing } from "lucide-react";
import Link from "next/link";

import { useLocale } from "@/components/providers/LocaleProvider";
import { getWardLabel } from "@/lib/i18n";
import type { Patient, PatientStatus, VitalSignalSample } from "@/types";

export type PatientListItem = {
  patient: Patient;
  latestVital: VitalSignalSample | null;
  openAlertCount: number;
};

type PatientCardProps = {
  item: PatientListItem;
};

const presentation: Record<
  PatientStatus,
  { label: { vi: string; en: string }; dot: string; badge: string }
> = {
  critical: {
    label: { vi: "Nguy kịch", en: "Critical" },
    dot: "bg-[color:var(--cs-danger)]",
    badge:
      "border-[color:rgba(229,72,77,0.2)] bg-[linear-gradient(135deg,rgba(229,72,77,0.14),rgba(229,72,77,0.07))] text-[color:var(--cs-danger)]",
  },
  at_risk: {
    label: { vi: "Cần chú ý", en: "Warning" },
    dot: "bg-[color:var(--cs-gold)]",
    badge:
      "border-[color:rgba(245,179,0,0.22)] bg-[linear-gradient(135deg,rgba(245,179,0,0.14),rgba(245,179,0,0.06))] text-[color:#8a6100]",
  },
  recent_symptom: {
    label: { vi: "Cần chú ý", en: "Warning" },
    dot: "bg-[color:var(--cs-gold)]",
    badge:
      "border-[color:rgba(245,179,0,0.22)] bg-[linear-gradient(135deg,rgba(245,179,0,0.14),rgba(245,179,0,0.06))] text-[color:#8a6100]",
  },
  healthy: {
    label: { vi: "Bình thường", en: "Normal" },
    dot: "bg-[color:var(--cs-teal)]",
    badge:
      "border-[color:rgba(0,150,136,0.18)] bg-[linear-gradient(135deg,rgba(0,150,136,0.12),rgba(0,150,136,0.05))] text-[color:var(--cs-teal)]",
  },
};

export function PatientCard({ item }: PatientCardProps) {
  const { locale } = useLocale();
  const { patient, latestVital, openAlertCount } = item;
  const state = presentation[patient.status];
  const initials = patient.name
    .split(" ")
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <Link
      href={`/patients/${patient.id}`}
      className="dashboard-surface group block rounded-[1.05rem] p-3 transition hover:-translate-y-0.5 hover:border-white/70 hover:shadow-[0_20px_44px_rgba(13,71,161,0.12)] sm:p-3.5"
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(230px,1.05fr)_minmax(420px,1.8fr)_minmax(210px,0.9fr)_24px] xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <PatientListAvatar initials={initials} hasOpenAlert={openAlertCount > 0} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-[14px] font-semibold text-[color:var(--cs-heading)]">
                {patient.name}
              </h3>
              <span className={["h-2 w-2 rounded-full", state.dot].join(" ")} />
            </div>
            <p className="mt-0.5 truncate text-[11px] text-[color:var(--cs-text-soft)]">
              {patient.age} {locale === "vi" ? "tuổi" : "years"}
              {patient.dbProfile?.ageGroup
                ? ` · ${patient.dbProfile.ageGroup.replace(/_/g, " ")}`
                : ""}
              {patient.dbProfile?.healthStatus
                ? ` · ${patient.dbProfile.healthStatus}`
                : ""}
              {" · "}
              {getWardLabel(patient, locale)}
              {patient.bed ? ` · ${locale === "vi" ? "Phòng" : "Bed"} ${patient.bed}` : ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <Vital
            label={locale === "vi" ? "Nhịp tim" : "HR"}
            value={latestVital?.vitals.heartRate}
            unit={locale === "vi" ? "nhịp/phút" : "bpm"}
            status={patient.status}
          />
          <Vital
            label={locale === "vi" ? "Oxy máu" : "SpO2"}
            value={latestVital?.vitals.spo2}
            unit="%"
            status={patient.status}
            inverse
          />
          <Vital
            label={locale === "vi" ? "Nhịp thở" : "RR"}
            value={latestVital?.vitals.respiratoryRate ?? undefined}
            unit={locale === "vi" ? "lần/phút" : "rpm"}
            status="healthy"
          />
          <Vital
            label={locale === "vi" ? "Huyết áp" : "BP"}
            value={
              latestVital?.vitals.systolicBp && latestVital.vitals.diastolicBp
                ? `${latestVital.vitals.systolicBp}/${latestVital.vitals.diastolicBp}`
                : undefined
            }
            unit="mmHg"
            status={patient.status}
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={[
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                state.badge,
              ].join(" ")}
            >
              {state.label[locale]}
            </span>
            {openAlertCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[color:rgba(229,72,77,0.08)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--cs-danger)]">
                <BellRing className="h-3 w-3" />
                {openAlertCount}
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-[color:var(--cs-text)]">
            {annotationFor(item, locale)}
          </p>
        </div>

        <ArrowRight className="hidden h-4 w-4 text-[color:var(--cs-primary)] transition group-hover:translate-x-0.5 xl:block" />
      </div>
    </Link>
  );
}

function PatientListAvatar({
  initials,
  hasOpenAlert,
}: {
  initials: string;
  hasOpenAlert: boolean;
}) {
  return (
    <span className="relative h-10 w-10 shrink-0">
      {hasOpenAlert ? (
        <>
          <span className="alert-pulse-ring" aria-hidden />
          <span className="alert-pulse-ring alert-pulse-ring--delay" aria-hidden />
        </>
      ) : null}
      <span
        className={[
          "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border bg-[linear-gradient(135deg,rgba(13,71,161,0.12),rgba(142,211,230,0.34))] text-[12px] font-bold text-[color:var(--cs-primary)] shadow-[0_10px_22px_rgba(13,71,161,0.08)]",
          hasOpenAlert
            ? "border-[color:rgba(229,72,77,0.45)] ring-2 ring-[color:rgba(229,72,77,0.22)]"
            : "border-white/65",
        ].join(" ")}
      >
        {initials}
      </span>
    </span>
  );
}

function Vital({
  label,
  value,
  unit,
  status,
  inverse = false,
}: {
  label: string;
  value: number | string | undefined;
  unit: string;
  status: PatientStatus;
  inverse?: boolean;
}) {
  const abnormal = status === "critical" || status === "at_risk";
  const TrendIcon = inverse ? ArrowDown : ArrowUp;
  return (
    <div className="rounded-[0.7rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.64),rgba(255,255,255,0.36))] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-[14px]">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-[color:var(--cs-text-soft)]">
        {label}
      </p>
      <p className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-[color:var(--cs-heading)]">
        {value ?? "--"}
        <span className="text-[9px] font-normal text-[color:var(--cs-text-soft)]">
          {unit}
        </span>
        {abnormal ? <TrendIcon className="h-3 w-3 text-[color:var(--cs-danger)]" /> : null}
      </p>
    </div>
  );
}

function annotationFor(item: PatientListItem, locale: "vi" | "en") {
  const spo2 = item.latestVital?.vitals.spo2;
  const hr = item.latestVital?.vitals.heartRate;
  if (spo2 !== undefined && spo2 <= 94) {
    return locale === "vi"
      ? `Oxy máu giảm còn ${spo2}%, cần đối chiếu mức cơ sở và hoạt động gần nhất.`
      : `SpO2 decreased to ${spo2}%; compare against baseline and recent activity.`;
  }
  if (hr !== undefined && hr >= 100) {
    return locale === "vi"
      ? `Nhịp tim ${hr} nhịp/phút, cao hơn mức theo dõi gần đây.`
      : `Heart rate is ${hr} bpm, above the recent monitored range.`;
  }
  return locale === "vi"
    ? "Ổn định - không ghi nhận bất thường mới trong lần đồng bộ gần nhất."
    : "Stable - no new abnormality in the latest sync.";
}
