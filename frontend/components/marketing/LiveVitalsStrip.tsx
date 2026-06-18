"use client";

import { useEffect, useMemo, useState } from "react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { MARKETING_COPY, t } from "@/lib/i18n/marketing";

type VitalPatient = {
  id: string;
  name: string;
  status: "stable" | "warning";
  hr: number;
  spo2: number;
  rr?: number;
  pulse?: boolean;
};

const BASE_PATIENTS: VitalPatient[] = [
  { id: "minh", name: "Minh", status: "stable", hr: 76, spo2: 98 },
  { id: "lan", name: "Lan", status: "warning", hr: 102, spo2: 94, pulse: true },
  { id: "tuan", name: "Tuấn", status: "stable", hr: 72, spo2: 97, rr: 16 },
];

function jitter(value: number, range: number, min: number, max: number) {
  const next = value + (Math.random() * range * 2 - range);
  return Math.round(Math.min(max, Math.max(min, next)));
}

export function LiveVitalsStrip() {
  const { locale } = useLocale();
  const reducedMotion = useReducedMotion();
  const copy = MARKETING_COPY.vitals;
  const [patients, setPatients] = useState(BASE_PATIENTS);
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;

    const interval = window.setInterval(() => {
      setPatients((current) =>
        current.map((patient) => {
          if (patient.id === "minh") {
            return {
              ...patient,
              hr: jitter(patient.hr, 2, 72, 82),
              spo2: jitter(patient.spo2, 1, 96, 99),
            };
          }
          if (patient.id === "lan") {
            return {
              ...patient,
              hr: jitter(patient.hr, 3, 98, 108),
              spo2: jitter(patient.spo2, 1, 92, 95),
            };
          }
          return {
            ...patient,
            spo2: jitter(patient.spo2, 1, 95, 99),
            rr: jitter(patient.rr ?? 16, 1, 14, 18),
          };
        }),
      );
      setFlashKey((key) => key + 1);
    }, 3500);

    return () => window.clearInterval(interval);
  }, [reducedMotion]);

  const prefix = t(copy.patientPrefix, locale);

  return (
    <div className="marketing-vitals-strip px-5 py-5 sm:px-8">
      <div className="marketing-container">
        <p className="marketing-caption mb-3 font-semibold uppercase tracking-[0.14em] text-[color:var(--cs-aqua)]">
          {t(MARKETING_COPY.hero.liveLabel, locale)}
        </p>
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {patients.map((patient) => (
            <VitalCard
              key={patient.id}
              patient={patient}
              prefix={prefix}
              flashKey={flashKey}
              reducedMotion={reducedMotion}
              locale={locale}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function VitalCard({
  patient,
  prefix,
  flashKey,
  reducedMotion,
  locale,
}: {
  patient: VitalPatient;
  prefix: string;
  flashKey: number;
  reducedMotion: boolean;
  locale: "vi" | "en";
}) {
  const copy = MARKETING_COPY.vitals;
  const statusLabel =
    patient.status === "warning"
      ? t(copy.needsReview, locale)
      : t(copy.stable, locale);

  const hrWidth = useMemo(
    () => Math.min(100, Math.max(18, ((patient.hr - 50) / 70) * 100)),
    [patient.hr],
  );

  const statusClass =
    patient.status === "warning"
      ? "marketing-status-warning"
      : "marketing-status-healthy";

  return (
    <article className="min-h-[148px] min-w-[220px] flex-1 rounded-[var(--radius-lg)] border border-white/12 bg-white/8 p-3.5 text-white backdrop-blur-sm sm:min-w-[240px]">
      <p className="text-[13px] font-semibold">
        {prefix} {patient.name}
      </p>

      <div className="mt-3 space-y-2 font-mono text-[12px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/75">{t(copy.hr, locale)}</span>
          <span
            key={`${patient.id}-hr-${flashKey}`}
            className={[
              "font-semibold tabular-nums",
              patient.pulse && !reducedMotion ? "marketing-hr-pulse" : "",
              !reducedMotion ? "marketing-vital-flash" : "",
            ].join(" ")}
          >
            {patient.hr}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/12">
          <div
            className={[
              "h-full rounded-full bg-[color:var(--cs-teal)] transition-all duration-700",
              patient.status === "warning" ? "bg-[color:var(--cs-gold)]" : "",
            ].join(" ")}
            style={{ width: `${hrWidth}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-white/75">{t(copy.spo2, locale)}</span>
          <span
            key={`${patient.id}-spo2-${flashKey}`}
            className={[
              "font-semibold tabular-nums",
              !reducedMotion ? "marketing-vital-flash" : "",
            ].join(" ")}
          >
            {patient.spo2}%
            {patient.id === "minh" ? " ↓" : patient.id === "tuan" ? " ↑" : ""}
          </span>
        </div>

        {patient.rr !== undefined ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-white/75">{t(copy.rr, locale)}</span>
            <span className="font-semibold tabular-nums">{patient.rr}</span>
          </div>
        ) : null}
      </div>

      <p
        className={[
          "mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
          statusClass,
        ].join(" ")}
      >
        <span
          className={[
            "h-2 w-2 rounded-full",
            patient.status === "warning" ? "bg-[color:var(--cs-gold)]" : "bg-[color:var(--cs-teal)]",
          ].join(" ")}
        />
        {statusLabel}
      </p>
    </article>
  );
}

export function LiveVitalsStripSkeleton() {
  return (
    <div className="marketing-vitals-strip px-5 py-5 sm:px-8">
      <div className="marketing-container flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`vital-skeleton-${index}`}
            className="h-[148px] min-w-[220px] flex-1 animate-pulse rounded-[var(--radius-lg)] bg-white/10"
          />
        ))}
      </div>
    </div>
  );
}
