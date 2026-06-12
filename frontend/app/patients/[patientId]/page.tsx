"use client";

import { ArrowLeft, BellRing, MapPin, UserRound } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AlertItem } from "@/components/alerts";
import { ClinicalShell } from "@/components/clinical/ClinicalShell";
import { PageState } from "@/components/clinical/PageState";
import { PatientAIChatPanel } from "@/components/clinical/PatientAIChatPanel";
import {
  pageBody,
  pageEyebrow,
  pageScrollRegion,
  pageSectionTitle,
  pageSurface,
} from "@/lib/page-layout";
import { useLocale } from "@/components/providers/LocaleProvider";
import {
  BloodPressureCard,
  MetricCard,
  TimeRangeSelector,
} from "@/components/vitals";
import { getGenderLabel, getPatientStatusLabel, getWardLabel } from "@/lib/i18n";
import { normalizePatientId } from "@/lib/patient-id";
import { alertRepository } from "@/lib/repositories/alert.repository";
import { patientRepository } from "@/lib/repositories/patient.repository";
import { vitalRepository } from "@/lib/repositories/vital.repository";
import type { Alert, MetricSummary, Patient, VitalSignalSample } from "@/types";

const PATIENT_RECORD_REFRESH_MS = 15000;
const PATIENT_CHART_HEIGHT = 210;

export default function PatientDetailPage() {
  const { locale } = useLocale();
  const params = useParams<{ patientId: string }>();
  const patientId = normalizePatientId(params.patientId);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vitals, setVitals] = useState<VitalSignalSample[]>([]);
  const [summaries, setSummaries] = useState<MetricSummary[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [range, setRange] = useState("24h");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    const load = async () => {
      try {
        const nextPatient = await patientRepository.findById(patientId);
        if (cancelled) return;

        setPatient(nextPatient);
        if (!nextPatient) {
          setError(
            locale === "vi"
              ? "Không tìm thấy bệnh nhân với mã hồ sơ này."
              : "No patient matches this record ID.",
          );
          return;
        }

        const [snapshotResult, alertsResult] = await Promise.allSettled([
          vitalRepository.getSnapshot(patientId, range),
          alertRepository.listByPatient(patientId),
        ]);
        if (cancelled) return;

        const loadErrors: string[] = [];
        if (snapshotResult.status === "fulfilled") {
          setVitals(snapshotResult.value.samples);
          setSummaries(snapshotResult.value.metricSummaries);
        } else {
          loadErrors.push(
            locale === "vi"
              ? "Không thể tải dữ liệu sinh tồn."
              : "Unable to load vital signs.",
          );
        }

        if (alertsResult.status === "fulfilled") {
          setAlerts(alertsResult.value);
        } else {
          loadErrors.push(
            locale === "vi"
              ? "Không thể tải lịch sử cảnh báo."
              : "Unable to load alert history.",
          );
        }

        setError(loadErrors.length ? loadErrors.join(" ") : null);
      } catch (nextError: unknown) {
        if (cancelled) return;
        setError(
          nextError instanceof Error
            ? nextError.message
            : locale === "vi"
              ? "Không thể tải hồ sơ bệnh nhân."
              : "Unable to load the patient record.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    intervalId = window.setInterval(() => void load(), PATIENT_RECORD_REFRESH_MS);
    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [locale, patientId, range]);

  if (loading && !patient) {
    return (
      <ClinicalShell viewportLocked>
        <PageState
          fill
          variant="loading"
          message={
            locale === "vi" ? "Đang tải hồ sơ bệnh nhân..." : "Loading patient record..."
          }
        />
      </ClinicalShell>
    );
  }

  if (!patient) {
    return (
      <ClinicalShell
        title={locale === "vi" ? "Không tìm thấy hồ sơ bệnh nhân" : "Patient record not found"}
        description={error ?? undefined}
        actions={
          <Link
            href="/patients"
            className="inline-flex h-10 items-center rounded-[0.7rem] bg-[color:var(--cs-primary)] px-4 text-[12px] font-semibold text-white"
          >
            {locale === "vi" ? "Quay lại danh sách" : "Back to patient list"}
          </Link>
        }
      >
        <PageState
          variant="error"
          message={
            error ??
            (locale === "vi"
              ? "Không tìm thấy bệnh nhân với mã hồ sơ này."
              : "No patient matches this record ID.")
          }
        />
      </ClinicalShell>
    );
  }

  const openAlerts = alerts.filter((alert) => !alert.acknowledged);
  const systolicSummary = summaries.find(
    (summary) => summary.metric === "systolic_bp",
  );
  const diastolicSummary = summaries.find(
    (summary) => summary.metric === "diastolic_bp",
  );
  const heartRateSummary = summaries.find(
    (summary) => summary.metric === "heart_rate",
  );
  const respiratoryRateSummary = summaries.find(
    (summary) => summary.metric === "respiratory_rate",
  );
  const spo2Summary = summaries.find(
    (summary) => summary.metric === "spo2",
  );

  return (
    <ClinicalShell
      viewportLocked
      actions={
        <Link
          href="/patients"
          className="inline-flex h-9 items-center gap-2 rounded-[0.7rem] border border-[color:var(--cs-border)] bg-white/78 px-3 text-[12px] font-semibold text-[color:var(--cs-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {locale === "vi" ? "Danh sách bệnh nhân" : "Patient list"}
        </Link>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <PatientHeader patient={patient} alertCount={openAlerts.length} />

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(330px,1fr)]">
          <div className="grid min-h-0 min-w-0 gap-3 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
            <section className={`${pageSurface} flex min-h-0 flex-col p-3`}>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className={pageEyebrow}>
                    {locale === "vi" ? "Biểu đồ sinh tồn" : "Vital charts"}
                  </p>
                  <h2 className={`mt-0.5 ${pageSectionTitle}`}>
                    {locale === "vi" ? "Diễn biến chỉ số sinh tồn" : "Vital-sign trends"}
                  </h2>
                </div>
                <TimeRangeSelector value={range} onChange={setRange} />
              </div>

              {error ? (
                <p className={`mt-2 shrink-0 rounded-[0.8rem] bg-[color:rgba(229,72,77,0.08)] px-3 py-2 ${pageBody} text-[color:var(--cs-danger)]`}>
                  {error}
                </p>
              ) : null}

              <div className="mt-3 grid min-h-0 flex-1 gap-3 md:grid-cols-2 md:grid-rows-2">
                {heartRateSummary ? (
                  <MetricCard
                    compact
                    summary={heartRateSummary}
                    vitals={vitals}
                    chartHeight={PATIENT_CHART_HEIGHT}
                  />
                ) : null}
                {systolicSummary && diastolicSummary ? (
                  <BloodPressureCard
                    compact
                    systolicSummary={systolicSummary}
                    diastolicSummary={diastolicSummary}
                    vitals={vitals}
                    chartHeight={PATIENT_CHART_HEIGHT}
                  />
                ) : null}
                {spo2Summary ? (
                  <MetricCard
                    compact
                    summary={spo2Summary}
                    vitals={vitals}
                    chartHeight={PATIENT_CHART_HEIGHT}
                  />
                ) : null}
                {respiratoryRateSummary ? (
                  <MetricCard
                    compact
                    summary={respiratoryRateSummary}
                    vitals={vitals}
                    chartHeight={PATIENT_CHART_HEIGHT}
                  />
                ) : null}
              </div>
            </section>

            <section className={`${pageSurface} flex min-h-0 flex-col p-3`}>
              <div className="flex shrink-0 items-center justify-between gap-2">
                <div>
                  <p className={pageEyebrow}>
                    {locale === "vi" ? "Lịch sử cảnh báo" : "Alert history"}
                  </p>
                  <h2 className={`mt-0.5 ${pageSectionTitle}`}>
                    {locale === "vi" ? "Cảnh báo gần đây" : "Recent alerts"}
                  </h2>
                </div>
                <span className="rounded-full bg-[color:rgba(229,72,77,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--cs-danger)]">
                  {openAlerts.length} {locale === "vi" ? "chưa xử lý" : "unresolved"}
                </span>
              </div>
              <div className={`${pageScrollRegion} mt-3 space-y-2`}>
                {alerts.length ? (
                  alerts.map((alert) => (
                    <AlertItem key={alert.id} alert={alert} compact />
                  ))
                ) : (
                  <p className={`rounded-[0.8rem] bg-white/64 px-3 py-4 ${pageBody} text-[color:var(--cs-text-soft)]`}>
                    {locale === "vi" ? "Chưa có cảnh báo cho bệnh nhân này." : "No alerts for this patient."}
                  </p>
                )}
              </div>
            </section>
          </div>

          <PatientAIChatPanel patient={patient} compact />
        </div>
      </div>
    </ClinicalShell>
  );
}

function PatientHeader({ patient, alertCount }: { patient: Patient; alertCount: number }) {
  const { locale } = useLocale();
  const status =
    patient.status === "critical"
      ? {
          label: getPatientStatusLabel(patient.status, locale),
          classes:
            "border-[color:rgba(229,72,77,0.22)] bg-[color:rgba(229,72,77,0.1)] text-[color:var(--cs-danger)]",
        }
      : patient.status === "healthy"
        ? {
            label: getPatientStatusLabel(patient.status, locale),
            classes:
              "border-[color:rgba(0,150,136,0.22)] bg-[color:rgba(0,150,136,0.1)] text-[color:var(--cs-teal)]",
          }
        : {
            label: getPatientStatusLabel(patient.status, locale),
            classes:
              "border-[color:rgba(245,179,0,0.28)] bg-[color:rgba(245,179,0,0.12)] text-[color:#8a6100]",
          };

  return (
    <section className={`${pageSurface} shrink-0 px-4 py-3`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(13,71,161,0.1),rgba(142,211,230,0.34))] text-[color:var(--cs-primary)]">
            <UserRound className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-[1.15rem] font-semibold text-[color:var(--cs-heading)]">{patient.name}</h1>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[color:var(--cs-text-soft)]">
              <span>{locale === "vi" ? "Mã hồ sơ" : "MRN"} {patient.mrn}</span>
              <span>{patient.age} {locale === "vi" ? "tuổi" : "years"}</span>
              <span>{getGenderLabel(patient.gender, locale)}</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {getWardLabel(patient, locale)} {patient.bed ? `· ${patient.bed}` : ""}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={["rounded-full border px-3 py-1 text-[11px] font-semibold", status.classes].join(" ")}>
            {status.label}
          </span>
          {alertCount ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:rgba(229,72,77,0.08)] px-3 py-1 text-[11px] font-semibold text-[color:var(--cs-danger)]">
              <BellRing className="h-3.5 w-3.5" />
              {alertCount} {locale === "vi" ? "cảnh báo chưa xử lý" : "unresolved alerts"}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
