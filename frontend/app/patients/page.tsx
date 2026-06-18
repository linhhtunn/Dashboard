"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { ClinicalShell } from "@/components/clinical/ClinicalShell";
import { PatientsBubbleChat } from "@/components/clinical/PatientsBubbleChat";
import { PatientListOverviewCards } from "@/components/patients/PatientListOverviewCards";
import { PatientTable, type PatientListItem } from "@/components/patients";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useVisibilityPolling } from "@/hooks/use-visibility-polling";
import { patientRepository } from "@/lib/repositories/patient.repository";

const PATIENTS_REFRESH_MS = 15000;

export default function PatientsPage() {
  const { locale } = useLocale();
  const [items, setItems] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefingUpdatedAt, setBriefingUpdatedAt] = useState(new Date());

  const loadPatients = useCallback(async () => {
    try {
      const payload = await patientRepository.list();
      setItems(payload);
      setError(null);
      setBriefingUpdatedAt(new Date());
    } catch (nextError: unknown) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : locale === "vi"
            ? "Không thể tải danh sách bệnh nhân."
            : "Unable to load patients.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [locale]);

  useVisibilityPolling(loadPatients, { intervalMs: PATIENTS_REFRESH_MS });

  const attentionItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.patient.status === "critical" ||
          // item.patient.status === "at_risk" ||
          item.openAlertCount > 0,
      ),
    [items],
  );
  const stableItems = useMemo(
    () => items.filter((item) => item.patient.status === "healthy"),
    [items],
  );

  return (
    <ClinicalShell
      viewportLocked
      eyebrow={locale === "vi" ? "Tổng quan ca trực" : "Shift overview"}
      title={
        locale === "vi" ? "Bệnh nhân cần ưu tiên hôm nay" : "Patients to prioritize today"
      }
      description={
        locale === "vi"
          ? "Dữ liệu sinh tồn đồng bộ mỗi 5 phút. Danh sách mặc định sắp xếp theo mức độ nghiêm trọng."
          : "Vital signs sync every 5 minutes. The list is sorted by severity by default."
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <PatientListOverviewCards items={items} loading={loading} />
        <div className="grid min-h-0 flex-1 gap-3 max-lg:grid-rows-[minmax(0,36%)_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)] lg:grid-rows-1">
        <aside className="dashboard-surface flex min-h-0 flex-col rounded-[1.15rem] p-4">
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] bg-[linear-gradient(135deg,rgba(13,71,161,0.12),rgba(0,150,136,0.1))] text-[color:var(--cs-primary)] shadow-[0_10px_24px_rgba(13,71,161,0.08)]">
                <Sparkles className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--cs-teal)]">
                  {locale === "vi" ? "Tóm tắt buổi sáng" : "AI Morning Briefing"}
                </p>
                <h2 className="mt-0.5 text-[1rem] font-semibold text-[color:var(--cs-heading)]">
                  {locale === "vi"
                    ? `Sáng nay · ${items.length} bệnh nhân`
                    : `This morning · ${items.length} patients`}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                void loadPatients();
              }}
              disabled={refreshing}
              className="dashboard-input flex h-8 w-8 items-center justify-center rounded-[0.65rem] text-[color:var(--cs-primary)] disabled:opacity-50"
              aria-label={locale === "vi" ? "Cập nhật briefing" : "Refresh briefing"}
            >
              <RefreshCw
                className={["h-3.5 w-3.5", refreshing ? "animate-spin" : ""].join(" ")}
              />
            </button>
          </div>

          <div className="dashboard-scroll-area mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 text-[13px] leading-5">
            <section>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[color:var(--cs-danger)]">
                  {locale === "vi"
                    ? `Cần chú ý (${attentionItems.length})`
                    : `Needs attention (${attentionItems.length})`}
                </h3>
                <span className="h-2 w-2 rounded-full bg-[color:var(--cs-danger)]" />
              </div>
              <div className="mt-2 space-y-2">
                {attentionItems.slice(0, 4).map((item) => (
                  <div
                    key={item.patient.id}
                    className="rounded-[0.8rem] border border-[color:rgba(229,72,77,0.12)] bg-[linear-gradient(135deg,rgba(229,72,77,0.08),rgba(255,255,255,0.2))] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.48)]"
                  >
                    <p className="font-semibold text-[color:var(--cs-heading)]">
                      {item.patient.name}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[color:var(--cs-text)]">
                      {buildBriefingAnnotation(item, locale)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="border-t border-white/45 pt-3">
              <h3 className="font-semibold text-[color:var(--cs-teal)]">
                {locale === "vi"
                  ? `Ổn định (${stableItems.length})`
                  : `Stable (${stableItems.length})`}
              </h3>
              <p className="mt-1.5 text-[12px] text-[color:var(--cs-text-soft)]">
                {stableItems.map((item) => item.patient.name).join(", ") ||
                  (locale === "vi" ? "Chưa có bệnh nhân ổn định." : "No stable patients.")}
              </p>
            </section>
          </div>

          <div className="mt-3 shrink-0 border-t border-white/45 pt-3 text-[11px] text-[color:var(--cs-text-soft)]">
            {locale === "vi" ? "Cập nhật lúc" : "Updated at"}{" "}
            {new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }).format(briefingUpdatedAt)}
            <p className="mt-1">
              {locale === "vi"
                ? "Chỉ hỗ trợ tham khảo, không thay thế chẩn đoán."
                : "AI support only. Not a diagnosis."}
            </p>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {loading ? (
            <div className="dashboard-surface rounded-[1.15rem] px-4 py-8 text-center text-[13px] text-[color:var(--cs-text-soft)]">
              {locale === "vi" ? "Đang tải danh sách bệnh nhân..." : "Loading patients..."}
            </div>
          ) : error ? (
            <div className="dashboard-surface rounded-[1.15rem] px-4 py-8 text-center text-[13px] text-[color:var(--cs-danger)]">
              {error}
            </div>
          ) : (
            <PatientTable items={items} fillHeight />
          )}
        </section>
      </div>

      {!loading && !error ? <PatientsBubbleChat items={items} /> : null}
      </div>
    </ClinicalShell>
  );
}

function buildBriefingAnnotation(item: PatientListItem, locale: "vi" | "en") {
  const spo2 = item.latestVital?.vitals.spo2;
  const heartRate = item.latestVital?.vitals.heartRate;
  if (spo2 !== undefined && spo2 <= 94) {
    return locale === "vi"
      ? `Oxy máu ${spo2}%, thấp hơn ngưỡng theo dõi.`
      : `SpO2 ${spo2}%, below the monitoring threshold.`;
  }
  if (heartRate !== undefined && heartRate >= 100) {
    return locale === "vi"
      ? `Nhịp tim ${heartRate} nhịp/phút, cao hơn mức cơ sở gần đây.`
      : `Heart rate ${heartRate} bpm, above the recent baseline.`;
  }
  return locale === "vi"
    ? `${item.openAlertCount} cảnh báo chưa xử lý, cần rà soát.`
    : `${item.openAlertCount} unresolved alert(s) require review.`;
}
