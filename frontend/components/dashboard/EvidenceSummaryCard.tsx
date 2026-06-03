import { ChevronRight } from "lucide-react";

import { PanelCard } from "@/components/common/PanelCard";
import type { AISummary, Evidence } from "@/types";

type EvidenceSummaryCardProps = {
  summary: AISummary;
};

function getEvidenceTitle(item: Evidence) {
  switch (item.metric) {
    case "heart_rate":
      return "Nhịp tim";
    case "hrv_rmssd":
      return "HRV - RMSSD";
    case "spo2":
      return "SpO₂";
    case "systolic_bp":
      return "Huyết áp tâm thu";
    case "diastolic_bp":
      return "Huyết áp tâm trương";
    default:
      return "Bằng chứng lâm sàng";
  }
}

function getEvidenceDescription(item: Evidence) {
  if (item.value === undefined) return "Bằng chứng dữ liệu có cấu trúc";

  const valueLabel = `${item.value}${item.unit ? ` ${item.unit}` : ""}`;
  if (item.comparisonValue === undefined) return valueLabel;

  const compareLabel = `${item.comparisonValue}${item.unit ? ` ${item.unit}` : ""}`;
  return `${valueLabel} so với ${compareLabel}`;
}

export function EvidenceSummaryCard({
  summary,
}: EvidenceSummaryCardProps) {
  const primaryEvidence = summary.evidence.slice(0, 2);
  const secondaryEvidence = summary.evidence.slice(2);

  const renderEvidenceItem = (item: Evidence, index: number) => (
    <div
      key={`${item.kind}-${index}`}
      className="dashboard-glass-soft flex items-start justify-between gap-3 rounded-[1rem] px-3 py-2.5"
    >
      <div>
        <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
          {getEvidenceTitle(item)}
        </p>
        <p className="mt-1 text-sm text-[color:var(--cs-text)]">
          {getEvidenceDescription(item)}
        </p>
        <p className="mt-1 text-xs text-[color:var(--cs-text-soft)]">
          {item.timestamp ?? summary.generatedAt}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {item.comparisonWindow ? (
          <span className="rounded-full bg-white/75 px-2 py-1 text-[11px] font-medium text-[color:var(--cs-text-soft)] ring-1 ring-[color:var(--cs-border)]">
            {item.comparisonWindow}
          </span>
        ) : null}
        <ChevronRight className="h-4 w-4 text-[color:var(--cs-text-soft)]" />
      </div>
    </div>
  );

  return (
    <PanelCard className="px-3.5 py-3.5">
      <div>
        <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
          Bằng chứng liên quan
        </p>
        <p className="mt-1 text-sm text-[color:var(--cs-text-soft)]">
          Các tín hiệu đang hỗ trợ cho phác đồ được mở.
        </p>
      </div>

      <div className="mt-3 space-y-2.5">{primaryEvidence.map(renderEvidenceItem)}</div>

      {secondaryEvidence.length > 0 ? (
        <details className="dashboard-details mt-3 rounded-[0.9rem] border border-[color:rgba(13,71,161,0.12)] bg-[color:rgba(255,255,255,0.38)] px-3 py-2.5">
          <summary className="cursor-pointer text-sm font-medium text-[color:var(--cs-primary)]">
            Xem thêm {secondaryEvidence.length} bằng chứng
          </summary>
          <div className="mt-3 space-y-2.5">
            {secondaryEvidence.map((item, index) =>
              renderEvidenceItem(item, index + primaryEvidence.length),
            )}
          </div>
        </details>
      ) : null}
    </PanelCard>
  );
}
