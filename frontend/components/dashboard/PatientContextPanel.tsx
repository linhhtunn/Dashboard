import type { AISummary, MedicationCycle, MetricSummary, Patient } from "@/types";

import { PanelCard } from "@/components/common/PanelCard";
import { ConditionMedicationCard } from "@/components/dashboard/ConditionMedicationCard";
import { EvidenceSummaryCard } from "@/components/dashboard/EvidenceSummaryCard";
import { PatientSummaryHeader } from "@/components/dashboard/PatientSummaryHeader";
import { RecentSymptomCard } from "@/components/dashboard/RecentSymptomCard";
import { VitalsOverviewCard } from "@/components/dashboard/VitalsOverviewCard";

const medicationCycle: MedicationCycle[] = [
  {
    medication: {
      vi: "Aspirin",
      en: "Aspirin",
    },
    dosage: "81 mg",
    schedule: {
      vi: "10:30 AM",
      en: "10:30 AM",
    },
    lastTakenAt: "2026-06-02T08:30:00Z",
    nextDoseAt: "2026-06-02T10:30:00Z",
  },
];

const patient: Patient = {
  id: "patient-a",
  mrn: "12345678",
  name: "Benh nhan A",
  age: 68,
  gender: "male",
  status: "healthy",
  wardCode: "cardiology_ward",
  wardLabel: {
    vi: "Khoa Tim mach",
    en: "Cardiology Ward",
  },
  bed: "12A",
  underlyingConditionCodes: [
    "hypertension",
    "type_2_diabetes",
    "ischemic_heart_disease",
  ],
  medicationCycle,
  recentSymptomCodes: ["shortness_of_breath"],
  lastUpdated: "2026-06-02T09:41:00Z",
};

const aiSummary: AISummary = {
  patientId: "patient-a",
  locale: "vi",
  question: "Benh nhan A co dang on dinh khong?",
  answer:
    "Benh nhan A hien chua co dau hieu can can thiep khan, nhung van nen tiep tuc theo doi do SpO2 thap hon baseline nhe va huyet ap tam thu dang o dau tren cua nguong du kien khi nghi.",
  keyFindings: [
    "Khong co bang chung cua alert critical moi trong 15 phut gan day.",
    "SpO2 dang thap hon baseline gan day nhung chua xuong duoi nguong can thiep.",
    "Can tiep tuc theo doi boi canh lam sang va xac nhan xu huong tiep theo.",
  ],
  status: "ready",
  confidence: "medium",
  evidence: [
    {
      kind: "metric_threshold",
      metric: "spo2",
      value: 94,
      unit: "%",
      timestamp: "2026-06-02T09:39:00Z",
      noteKey: "spo2_below_recent_baseline",
    },
    {
      kind: "trend_change",
      metric: "systolic_bp",
      value: 124,
      unit: "mmHg",
      comparisonValue: 118,
      comparisonWindow: "15m",
      timestamp: "2026-06-02T09:40:00Z",
    },
    {
      kind: "trend_change",
      metric: "heart_rate",
      value: 82,
      unit: "bpm",
      comparisonValue: 76,
      comparisonWindow: "15m",
      timestamp: "2026-06-02T09:40:00Z",
    },
  ],
  generatedAt: "2026-06-02T09:41:00Z",
  disclaimerKey: "ai_support_only",
};

const metrics: MetricSummary[] = [
  {
    metric: "heart_rate",
    currentValue: 72,
    unit: "bpm",
    average15Min: 75,
    trend: "down",
    changePct: -4,
    status: "healthy",
  },
  {
    metric: "hrv_rmssd",
    currentValue: 42,
    unit: "ms",
    average15Min: 39,
    trend: "up",
    changePct: 6,
    status: "healthy",
  },
  {
    metric: "spo2",
    currentValue: 94,
    unit: "%",
    average15Min: 95,
    trend: "down",
    changePct: -1,
    status: "recent_symptom",
  },
  {
    metric: "systolic_bp",
    currentValue: 118,
    unit: "mmHg",
    average15Min: 121,
    trend: "down",
    changePct: -3,
    status: "healthy",
  },
  {
    metric: "diastolic_bp",
    currentValue: 76,
    unit: "mmHg",
    average15Min: 78,
    trend: "down",
    changePct: -2,
    status: "healthy",
  },
];

export function PatientContextPanel() {
  return (
    <PanelCard className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b dashboard-subtle-divider px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
              Tong quan benh nhan
            </p>
            <p className="mt-1 text-xs text-[color:var(--cs-text-soft)]">
              Panel nay khoa khung va chi cuon cac thong tin ben trong.
            </p>
          </div>

          <span className="rounded-full bg-[color:rgba(13,71,161,0.06)] px-3 py-1 text-xs font-medium text-[color:var(--cs-primary)]">
            Evidence + context
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-5">
        <div className="flex min-h-full flex-col gap-4">
          <PatientSummaryHeader patient={patient} />
          <ConditionMedicationCard patient={patient} />
          <RecentSymptomCard
            symptomLabel="Ghi nhan kho tho nhe gan day."
            timestampLabel="2 gio truoc"
          />
          <EvidenceSummaryCard summary={aiSummary} />
          <VitalsOverviewCard metrics={metrics} />
        </div>
      </div>
    </PanelCard>
  );
}
