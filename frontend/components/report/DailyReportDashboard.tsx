"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Stethoscope,
  UsersRound,
} from "lucide-react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { getAlertTypeLabel } from "@/lib/i18n/domain";
import { reportRepository } from "@/lib/repositories/report.repository";
import type { DailyReportResponse } from "@/lib/report/types";

function formatDate(value: string, locale: "vi" | "en") {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatTime(value: string, locale: "vi" | "en") {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DailyReportDashboard() {
  const { locale } = useLocale();
  const [data, setData] = useState<DailyReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await reportRepository.getDaily();
        if (!cancelled) setData(next);
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : locale === "vi"
                ? "Không thể tải báo cáo hàng ngày."
                : "Unable to load the daily report.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const cards = [
    {
      label: locale === "vi" ? "Bệnh nhân đã khám" : "Patients reviewed",
      value: data?.examined_patients ?? 0,
      note: locale === "vi" ? "Bệnh nhân duy nhất hôm nay" : "Unique patients today",
      icon: UsersRound,
      tone: "var(--cs-primary)",
    },
    {
      label: locale === "vi" ? "Lượt xác nhận" : "Confirmations",
      value: data?.encounter_count ?? 0,
      note: locale === "vi" ? "Kết luận đã ghi nhận" : "Conclusions recorded",
      icon: CheckCircle2,
      tone: "var(--cs-success)",
    },
    {
      label: locale === "vi" ? "Ca nghiêm trọng đã xem" : "Critical cases reviewed",
      value: data?.critical_reviewed ?? 0,
      note: locale === "vi" ? "Cảnh báo mức nghiêm trọng" : "Critical-severity alerts",
      icon: Activity,
      tone: "var(--cs-danger)",
    },
    {
      label: locale === "vi" ? "Đang chờ bác sĩ" : "Awaiting doctor",
      value: data?.pending_confirmations ?? 0,
      note: locale === "vi" ? "Cần xem và xác nhận" : "Need review and confirmation",
      icon: AlertTriangle,
      tone: "var(--cs-warning)",
    },
  ];

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--cs-teal)]">
            {locale === "vi" ? "Hoạt động lâm sàng trong ngày" : "Today's clinical activity"}
          </p>
          <h1 className="mt-1 text-[1.55rem] font-semibold tracking-[-0.025em] text-[color:var(--cs-heading)] sm:text-[1.85rem]">
            {locale === "vi" ? "Báo cáo hàng ngày" : "Daily report"}
          </h1>
          <p className="mt-1 text-[12px] text-[color:var(--cs-text-soft)]">
            {data ? formatDate(data.date, locale) : "..."}
            {data?.doctor_name ? ` · ${data.doctor_name}` : ""}
          </p>
        </div>

        {data ? (
          <div className="dashboard-surface flex items-center gap-3 rounded-[0.9rem] px-4 py-2.5">
            <Clock3 className="h-5 w-5 text-[color:var(--cs-teal)]" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--cs-text-soft)]">
                {locale === "vi" ? "Ca trực hiện tại" : "Current shift"}
              </p>
              <p className="text-[12px] font-semibold text-[color:var(--cs-heading)]">
                {data.shift_label[locale]} · {data.shift_hours[locale]}
              </p>
            </div>
          </div>
        ) : null}
      </header>

      {error ? (
        <div className="rounded-[0.85rem] border border-[color:rgba(229,72,77,0.22)] bg-[color:rgba(229,72,77,0.08)] px-4 py-3 text-[12px] text-[color:var(--cs-danger)]">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, note, icon: Icon, tone }) => (
          <article key={label} className="dashboard-surface rounded-[1rem] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold text-[color:var(--cs-text-soft)]">{label}</p>
                <p className="mt-2 text-[1.75rem] font-semibold tracking-[-0.04em] text-[color:var(--cs-heading)]">
                  {loading ? "–" : value}
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-[0.8rem] bg-white/60" style={{ color: tone }}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-2 text-[10px] text-[color:var(--cs-text-soft)]">{note}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-surface overflow-hidden rounded-[1rem]">
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--cs-border)] px-4 py-3.5">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-[color:var(--cs-primary)]" />
            <h2 className="text-[13px] font-semibold text-[color:var(--cs-heading)]">
              {locale === "vi" ? "Các lượt khám đã ghi nhận" : "Recorded reviews"}
            </h2>
          </div>
          <span className="rounded-full bg-[color:rgba(13,71,161,0.08)] px-2.5 py-1 text-[10px] font-semibold text-[color:var(--cs-primary)]">
            {data?.activities.length ?? 0} {locale === "vi" ? "lượt" : "reviews"}
          </span>
        </div>

        {!loading && data?.activities.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-4 text-center">
            <CalendarDays className="h-9 w-9 text-[color:var(--cs-text-soft)] opacity-45" />
            <p className="mt-3 text-[13px] font-semibold text-[color:var(--cs-heading)]">
              {locale === "vi" ? "Chưa có lượt khám nào được ghi nhận hôm nay" : "No reviews recorded today"}
            </p>
            <p className="mt-1 max-w-md text-[11px] text-[color:var(--cs-text-soft)]">
              {locale === "vi"
                ? "Khi bác sĩ xác nhận một cảnh báo, hoạt động sẽ tự động xuất hiện tại đây."
                : "Doctor-confirmed alerts will automatically appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="bg-white/35 text-[10px] uppercase tracking-[0.1em] text-[color:var(--cs-text-soft)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">{locale === "vi" ? "Thời gian" : "Time"}</th>
                  <th className="px-4 py-3 font-semibold">{locale === "vi" ? "Bệnh nhân" : "Patient"}</th>
                  <th className="px-4 py-3 font-semibold">{locale === "vi" ? "Khoa / giường" : "Department / bed"}</th>
                  <th className="px-4 py-3 font-semibold">{locale === "vi" ? "Nội dung xem" : "Review"}</th>
                  <th className="px-4 py-3 font-semibold">{locale === "vi" ? "Kết luận" : "Conclusion"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--cs-border)]">
                {data?.activities.map((activity) => (
                  <tr key={activity.id} className="text-[12px] transition hover:bg-white/30">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-[color:var(--cs-heading)]">
                      {formatTime(activity.completed_at, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/patients/${activity.patient_id}`} className="font-semibold text-[color:var(--cs-primary)] hover:underline">
                        {activity.patient_name}
                      </Link>
                      <p className="mt-0.5 text-[10px] text-[color:var(--cs-text-soft)]">{activity.patient_id}</p>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--cs-text)]">
                      {activity.department_label[locale]}
                      {activity.bed ? ` · ${activity.bed}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <span className={[
                        "inline-flex rounded-full px-2 py-1 text-[10px] font-semibold",
                        activity.severity === "critical"
                          ? "bg-[color:rgba(229,72,77,0.1)] text-[color:var(--cs-danger)]"
                          : "bg-[color:rgba(245,179,0,0.12)] text-[color:#8a6100]",
                      ].join(" ")}>
                        {getAlertTypeLabel(activity.alert_type, locale)}
                      </span>
                    </td>
                    <td className="max-w-[320px] px-4 py-3 text-[color:var(--cs-text)]">
                      {activity.conclusion || (locale === "vi" ? "Đã xác nhận lâm sàng" : "Clinically confirmed")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="flex items-center gap-1.5 text-[10px] text-[color:var(--cs-text-soft)]">
        <Stethoscope className="h-3.5 w-3.5" />
        {locale === "vi"
          ? "Một bệnh nhân được tính là đã khám khi bác sĩ xác nhận ít nhất một cảnh báo trong ngày."
          : "A patient is counted as reviewed after a doctor confirms at least one alert that day."}
      </p>
    </div>
  );
}
