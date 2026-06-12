"use client";

import { useEffect, useState } from "react";

import { ClinicalShell } from "@/components/clinical/ClinicalShell";
import { PageState } from "@/components/clinical/PageState";
import { useLocale } from "@/components/providers/LocaleProvider";
import { MetricCard, TimeRangeSelector, VitalChart } from "@/components/vitals";
import { pageSurface } from "@/lib/page-layout";
import { vitalRepository } from "@/lib/repositories/vital.repository";
import type { MetricSummary, VitalSignalSample } from "@/types";

export default function VitalsPreviewPage() {
  const { locale } = useLocale();
  const [previewVitals, setPreviewVitals] = useState<VitalSignalSample[]>([]);
  const [previewSummaries, setPreviewSummaries] = useState<MetricSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      vitalRepository.listByPatient("P001"),
      vitalRepository.listMetricSummaries("P001"),
    ])
      .then(([vitals, summaries]) => {
        if (cancelled) return;
        setPreviewVitals(vitals);
        setPreviewSummaries(summaries);
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        setError(
          nextError instanceof Error
            ? nextError.message
            : locale === "vi"
              ? "Không thể tải dữ liệu preview chỉ số sinh tồn."
              : "Unable to load vitals preview data.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  return (
    <ClinicalShell
      eyebrow={locale === "vi" ? "Công cụ nội bộ" : "Internal tool"}
      title={
        locale === "vi"
          ? "Chuẩn hóa component chỉ số sinh tồn"
          : "Vitals component preview"
      }
      description={
        locale === "vi"
          ? "Kiểm tra MetricCard, VitalChart và TimeRangeSelector trước khi gắn vào màn hình bệnh nhân."
          : "Validate MetricCard, VitalChart, and TimeRangeSelector before wiring into patient screens."
      }
      actions={<TimeRangeSelector />}
    >
      {loading ? (
        <PageState
          variant="loading"
          message={locale === "vi" ? "Đang tải dữ liệu preview..." : "Loading preview data..."}
        />
      ) : error ? (
        <PageState variant="error" message={error} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {previewSummaries.map((summary) => (
              <MetricCard
                key={summary.metric}
                summary={summary}
                vitals={previewVitals}
              />
            ))}
          </div>

          <article className={`${pageSurface} p-4`}>
            <h2 className="text-[14px] font-semibold text-[color:var(--cs-heading)]">
              {locale === "vi" ? "Biểu đồ SpO2 độc lập" : "Standalone SpO2 chart"}
            </h2>
            <div className="mt-4">
              <VitalChart data={previewVitals} metric="spo2" height={220} />
            </div>
          </article>
        </div>
      )}
    </ClinicalShell>
  );
}
