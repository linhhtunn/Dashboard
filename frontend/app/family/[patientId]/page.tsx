"use client";

import {
  Activity,
  Bell,
  Check,
  HeartPulse,
  Moon,
  Pill,
  ShieldCheck,
  Wind,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PageState } from "@/components/clinical/PageState";
import { useLocale } from "@/components/providers/LocaleProvider";
import { familyContainer, pageSectionTitle, pageSurface } from "@/lib/page-layout";
import { normalizePatientId } from "@/lib/patient-id";
import { patientRepository } from "@/lib/repositories/patient.repository";
import { vitalRepository } from "@/lib/repositories/vital.repository";
import type { Patient, VitalSignalSample } from "@/types";

export default function FamilyPage() {
  const { locale } = useLocale();
  const params = useParams<{ patientId: string }>();
  const patientId = normalizePatientId(params.patientId);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [latestVital, setLatestVital] = useState<VitalSignalSample | null>(null);
  const [medicationConfirmed, setMedicationConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedPatientId, setResolvedPatientId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      patientRepository.findById(patientId),
      vitalRepository.listByPatient(patientId),
    ]).then(([nextPatient, samples]) => {
      if (cancelled) return;
      setPatient(nextPatient);
      setLatestVital(samples.at(-1) ?? null);
      if (nextPatient) {
        setError(null);
      } else {
        setError(
          locale === "vi"
            ? "Không tìm thấy thông tin người thân."
            : "Family member information was not found.",
        );
      }
    }).catch(() => {
      if (cancelled) return;
      setPatient(null);
      setError(
        locale === "vi"
          ? "Không thể tải thông tin người thân."
          : "Unable to load family member information.",
      );
    }).finally(() => {
      if (!cancelled) setResolvedPatientId(patientId);
    });

    return () => {
      cancelled = true;
    };
  }, [locale, patientId]);

  const loading = resolvedPatientId !== patientId;

  if (loading) {
    return (
      <main className="dashboard-scroll-area h-full overflow-y-auto">
        <div className={`${familyContainer} flex min-h-full items-center justify-center`}>
          <PageState
            variant="loading"
            message={
              locale === "vi" ? "Đang tải thông tin người thân..." : "Loading family view..."
            }
            className="w-full"
          />
        </div>
      </main>
    );
  }

  if (error || !patient) {
    return (
      <main className="dashboard-scroll-area h-full overflow-y-auto">
        <div className={`${familyContainer} flex min-h-full items-center justify-center`}>
          <PageState
            variant="error"
            message={
              error ??
              (locale === "vi"
                ? "Không tìm thấy thông tin người thân."
                : "Family member information was not found.")
            }
            className="w-full"
          />
        </div>
      </main>
    );
  }

  const spo2 = latestVital?.vitals.spo2;
  const heartRate = latestVital?.vitals.heartRate;
  const updatedAt = latestVital?.timestamp ?? patient.lastUpdated;
  const overall =
    patient.status === "critical"
      ? { label: locale === "vi" ? "Đáng lo" : "Concerning", color: "danger" as const }
      : patient.status === "healthy"
        ? { label: locale === "vi" ? "Bình thường" : "Normal", color: "success" as const }
        : { label: locale === "vi" ? "Cần chú ý" : "Needs attention", color: "warning" as const };

  return (
    <main className="dashboard-scroll-area h-full overflow-y-auto">
      <div className={familyContainer}>
        <header className="flex flex-col gap-3 border-b border-[color:var(--cs-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[color:var(--cs-teal)]">
              CareSignal Family
            </p>
            <h1 className="mt-1 text-[1.75rem] font-semibold text-[color:var(--cs-heading)]">
              {locale === "vi" ? `Tình trạng của ${patient.gender === "male" ? "Ba" : "Mẹ"}` : "Your family member's condition"}
            </h1>
            <p className="mt-1 text-[14px] text-[color:var(--cs-text-soft)]">{patient.name}</p>
          </div>
          <p className="text-[12px] text-[color:var(--cs-text-soft)]">
            {locale === "vi" ? "Cập nhật lúc" : "Updated at"}{" "}
            {new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(updatedAt))}
          </p>
        </header>

        <section className="mt-6">
          <h2 className={pageSectionTitle}>
            {locale === "vi" ? "Tổng quan hôm nay" : "Today's overview"}
          </h2>
          <div className={["mt-3 rounded-[1.4rem] border p-5", toneClasses(overall.color)].join(" ")}>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/72">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <p className="text-[1.2rem] font-semibold">{overall.label}</p>
                <p className="mt-1 text-[14px] leading-6">
                  {locale === "vi"
                    ? "Bác sĩ đang theo dõi sát hơn hôm nay. Gia đình chưa cần thay đổi chăm sóc nếu chưa có hướng dẫn mới."
                    : "The clinician is monitoring more closely today. No care changes are needed unless new guidance arrives."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <h2 className={pageSectionTitle}>
            {locale === "vi" ? "Các chỉ số" : "Health indicators"}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FamilyMetric icon={HeartPulse} label={locale === "vi" ? "Tim" : "Heart"} state={heartRate && heartRate > 100 ? "warning" : "success"} locale={locale} />
            <FamilyMetric icon={Activity} label={locale === "vi" ? "Oxy" : "Oxygen"} state={spo2 && spo2 < 94 ? "danger" : spo2 && spo2 < 97 ? "warning" : "success"} locale={locale} />
            <FamilyMetric icon={Wind} label={locale === "vi" ? "Nhịp thở" : "Breathing"} state={patient.status === "healthy" ? "success" : "warning"} locale={locale} />
            <FamilyMetric icon={Bell} label={locale === "vi" ? "Huyết áp" : "Blood pressure"} state={patient.status === "critical" ? "warning" : "success"} locale={locale} />
          </div>
        </section>

        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          <section className={`${pageSurface} p-5`}>
            <h2 className={pageSectionTitle}>
              {locale === "vi" ? "Thông báo từ bác sĩ" : "Message from the clinician"}
            </h2>
            <div className="mt-3 rounded-[1rem] bg-[color:var(--cs-primary-soft)] p-4">
              <p className="text-[12px] font-semibold text-[color:var(--cs-primary)]">
                07:20 - {locale === "vi" ? "Bác sĩ Minh đã xem xét tình trạng" : "Dr. Minh reviewed the condition"}
              </p>
              <p className="mt-2 text-[14px] leading-6 text-[color:var(--cs-text)]">
                {locale === "vi"
                  ? "Đang theo dõi chỉ số oxy. Chưa cần can thiệp, gia đình tiếp tục chăm sóc như thường lệ."
                  : "Oxygen is being monitored. No intervention is needed; continue normal care."}
              </p>
            </div>
          </section>

          <section className={`${pageSurface} p-5`}>
            <h2 className={pageSectionTitle}>
              {locale === "vi" ? "Nhắc nhở uống thuốc" : "Medication reminder"}
            </h2>
            <div className="mt-3 flex items-start gap-3 rounded-[1rem] bg-white/68 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:rgba(245,179,0,0.14)] text-[color:#8a6100]">
                <Pill className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[color:var(--cs-heading)]">
                  08:00 - {patient.medicationCycle[0]?.medication[locale] ?? "Amlodipine 5mg"}
                </p>
                <button
                  type="button"
                  disabled={medicationConfirmed}
                  onClick={() => setMedicationConfirmed(true)}
                  className="mt-3 inline-flex h-10 items-center gap-2 rounded-[0.7rem] bg-[color:var(--cs-primary)] px-4 text-[12px] font-semibold text-white disabled:bg-[color:var(--cs-teal)]"
                >
                  <Check className="h-4 w-4" />
                  {medicationConfirmed
                    ? locale === "vi" ? "Đã ghi nhận" : "Recorded"
                    : locale === "vi" ? "Xác nhận đã cho uống" : "Confirm medication given"}
                </button>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          <SimpleActivity icon={Moon} title={locale === "vi" ? "Giấc ngủ tối qua" : "Sleep last night"} text={locale === "vi" ? "Ngủ tương đối đều, có 2 lần thức giấc ngắn." : "Mostly steady sleep with two short awakenings."} />
          <SimpleActivity icon={Activity} title={locale === "vi" ? "Hoạt động hôm nay" : "Today's activity"} text={locale === "vi" ? "Hoạt động nhẹ trong phòng, đang nghỉ ngơi." : "Light activity in the room, currently resting."} />
        </section>
      </div>
    </main>
  );
}

function FamilyMetric({ icon: Icon, label, state, locale }: { icon: typeof Activity; label: string; state: "success" | "warning" | "danger"; locale: "vi" | "en" }) {
  const text =
    state === "success"
      ? locale === "vi" ? "Bình thường" : "Normal"
      : state === "warning"
        ? locale === "vi" ? "Cần chú ý" : "Needs attention"
        : locale === "vi" ? "Đáng lo" : "Concerning";
  return (
    <article className={["rounded-[1.2rem] border p-4", toneClasses(state)].join(" ")}>
      <Icon className="h-5 w-5" />
      <p className="mt-4 text-[13px] font-semibold">{label}</p>
      <p className="mt-1 text-[1rem] font-semibold">{text}</p>
    </article>
  );
}

function SimpleActivity({ icon: Icon, title, text }: { icon: typeof Activity; title: string; text: string }) {
  return (
    <article className={`${pageSurface} p-5`}>
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-[color:var(--cs-primary)]" />
        <h2 className={pageSectionTitle}>{title}</h2>
      </div>
      <p className="mt-3 text-[14px] leading-6 text-[color:var(--cs-text)]">{text}</p>
    </article>
  );
}

function toneClasses(state: "success" | "warning" | "danger") {
  if (state === "danger") return "border-[color:rgba(229,72,77,0.22)] bg-[color:rgba(229,72,77,0.09)] text-[color:var(--cs-danger)]";
  if (state === "warning") return "border-[color:rgba(245,179,0,0.3)] bg-[color:rgba(245,179,0,0.12)] text-[color:#805b00]";
  return "border-[color:rgba(0,150,136,0.22)] bg-[color:rgba(0,150,136,0.09)] text-[color:var(--cs-teal)]";
}
