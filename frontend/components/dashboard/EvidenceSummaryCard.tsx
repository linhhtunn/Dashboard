import { ChevronRight, ShieldCheck } from "lucide-react";

import { PanelCard } from "@/components/common/PanelCard";
import type { AISummary, Evidence } from "@/types";

type EvidenceSummaryCardProps = {
  summary: AISummary;
};

function getEvidenceTitle(item: Evidence) {
  switch (item.metric) {
    case "heart_rate":
      return "Nhip tim";
    case "hrv_rmssd":
      return "HRV - RMSSD";
    case "spo2":
      return "SpO2";
    case "systolic_bp":
      return "Huyet ap tam thu";
    case "diastolic_bp":
      return "Huyet ap tam truong";
    default:
      return "Bang chung lam sang";
  }
}

function getEvidenceDescription(item: Evidence) {
  if (item.value === undefined) return "Bang chung du lieu co cau truc";

  const valueLabel = `${item.value}${item.unit ? ` ${item.unit}` : ""}`;
  if (item.comparisonValue === undefined) return valueLabel;

  const compareLabel = `${item.comparisonValue}${item.unit ? ` ${item.unit}` : ""}`;
  return `${valueLabel} vs ${compareLabel}`;
}

export function EvidenceSummaryCard({
  summary,
}: EvidenceSummaryCardProps) {
  const primaryEvidence = summary.evidence.slice(0, 2);
  const secondaryEvidence = summary.evidence.slice(2);

  const renderEvidenceItem = (item: Evidence, index: number) => (
    <div
      key={`${item.kind}-${index}`}
      className="dashboard-glass-soft flex items-start justify-between gap-4 rounded-[1.15rem] px-4 py-3"
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
    <PanelCard className="px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
            Tom tat bang chung
          </p>
          <p className="mt-1 text-sm text-[color:var(--cs-text-soft)]">
            Cac tin hieu dang ho tro cho phan tom tat AI hien tai.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-[color:rgba(13,71,161,0.06)] px-3 py-1 text-xs font-medium text-[color:var(--cs-primary)]">
          <ShieldCheck className="h-3.5 w-3.5" />
          Lien ket voi tom tat AI
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {primaryEvidence.map(renderEvidenceItem)}
      </div>

      {secondaryEvidence.length > 0 ? (
        <details className="dashboard-details mt-4 rounded-[1rem] border border-[color:rgba(13,71,161,0.12)] bg-[color:rgba(255,255,255,0.38)] px-3 py-3">
          <summary className="cursor-pointer text-sm font-medium text-[color:var(--cs-primary)]">
            Xem them {secondaryEvidence.length} bang chung
          </summary>
          <div className="mt-3 space-y-3">
            {secondaryEvidence.map((item, index) =>
              renderEvidenceItem(item, index + primaryEvidence.length),
            )}
          </div>
        </details>
      ) : null}
    </PanelCard>
  );
}
