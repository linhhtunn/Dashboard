import { AppLayout } from "../app-layout";
import { MetricCard, TimeRangeSelector, VitalChart } from "@/components/vitals";
import type { MetricSummary, VitalSign } from "@/types";

const vitals: VitalSign[] = [
  {
    patientId: "p-001",
    timestamp: "2026-06-02T08:00:00Z",
    heartRate: 82,
    respiratoryRate: 16,
    systolicBp: 118,
    diastolicBp: 76,
    spo2: 98,
    glucoseLevel: 104,
    motionStatus: "still",
  },
  {
    patientId: "p-001",
    timestamp: "2026-06-02T08:03:00Z",
    heartRate: 86,
    respiratoryRate: 17,
    systolicBp: 122,
    diastolicBp: 78,
    spo2: 97,
    glucoseLevel: 111,
    motionStatus: "walking",
  },
  {
    patientId: "p-001",
    timestamp: "2026-06-02T08:06:00Z",
    heartRate: 92,
    respiratoryRate: 18,
    systolicBp: 126,
    diastolicBp: 82,
    spo2: 96,
    glucoseLevel: 126,
    motionStatus: "walking",
  },
  {
    patientId: "p-001",
    timestamp: "2026-06-02T08:09:00Z",
    heartRate: 124,
    respiratoryRate: 23,
    systolicBp: 146,
    diastolicBp: 92,
    spo2: 91,
    glucoseLevel: 184,
    motionStatus: "running",
  },
  {
    patientId: "p-001",
    timestamp: "2026-06-02T08:12:00Z",
    heartRate: 96,
    respiratoryRate: 18,
    systolicBp: 128,
    diastolicBp: 80,
    spo2: 95,
    glucoseLevel: 138,
    motionStatus: "still",
  },
];

const summaries: MetricSummary[] = [
  {
    metric: "heart_rate",
    currentValue: 96,
    unit: "bpm",
    average15Min: 95,
    trend: "down",
    changePct: 4,
    status: "at_risk",
  },
  {
    metric: "blood_pressure",
    currentValue: 128,
    displayValue: "128/80",
    unit: "mmHg",
    average15Min: 125,
    trend: "up",
    changePct: 3,
    status: "healthy",
  },
  {
    metric: "spo2",
    currentValue: 95,
    unit: "%",
    average15Min: 96,
    trend: "stable",
    status: "healthy",
  },
];

export default function VitalsPreviewPage() {
  return (
    <AppLayout>
      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-secondary">
              Vitals snapshot
            </p>
            <h1 className="mt-1 text-2xl font-semibold leading-8 text-text-strong">
              Component preview
            </h1>
          </div>
          <TimeRangeSelector />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {summaries.map((summary) => (
            <MetricCard
              key={summary.metric}
              summary={summary}
              vitals={vitals}
            />
          ))}
        </div>

        <article className="rounded-lg border border-border bg-panel p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-text-strong">
            Standalone SpO2 chart
          </h2>
          <div className="mt-5">
            <VitalChart data={vitals} metric="spo2" height={160} />
          </div>
        </article>
      </section>
    </AppLayout>
  );
}
