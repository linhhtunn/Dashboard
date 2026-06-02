import { AppLayout } from "../app-layout";
import { AlertPanel } from "@/components/alerts";
import { MetricCard, TimeRangeSelector } from "@/components/vitals";
import { alertRepository } from "@/lib/repositories/alert.repository";
import { patientRepository } from "@/lib/repositories/patient.repository";
import { vitalRepository } from "@/lib/repositories/vital.repository";

export default function DashboardPage() {
  const patients = patientRepository.list();
  const openAlerts = alertRepository.listOpen();
  const primaryPatient = patients[0];
  const vitals = vitalRepository.listByPatient(primaryPatient.id);
  const metricSummaries = vitalRepository.listMetricSummaries(primaryPatient.id);

  return (
    <AppLayout>
      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-secondary">Dashboard</p>
            <h1 className="mt-1 text-2xl font-semibold leading-8 text-text-strong">
              Patient monitoring overview
            </h1>
          </div>
          <TimeRangeSelector />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-lg border border-border bg-panel p-5 shadow-sm">
            <p className="text-sm text-text-body">Active patients</p>
            <p className="mt-3 text-3xl font-semibold text-text-strong">
              {patients.length}
            </p>
            <p className="mt-2 text-xs text-text-body">Repository census</p>
          </article>

          <article className="rounded-lg border border-border bg-panel p-5 shadow-sm">
            <p className="text-sm text-text-body">Open alerts</p>
            <p className="mt-3 text-3xl font-semibold text-text-strong">
              {openAlerts.length}
            </p>
            <p className="mt-2 text-xs text-text-body">
              Needs clinician review
            </p>
          </article>

          <article className="rounded-lg border border-border bg-panel p-5 shadow-sm">
            <p className="text-sm text-text-body">Current patient</p>
            <p className="mt-3 truncate text-3xl font-semibold text-text-strong">
              {primaryPatient.name}
            </p>
            <p className="mt-2 text-xs text-text-body">
              {primaryPatient.ward} / {primaryPatient.bed}
            </p>
          </article>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-secondary">
              Vitals snapshot
            </p>
            <h2 className="mt-1 text-lg font-semibold text-text-strong">
              {primaryPatient.name}
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {metricSummaries.map((summary) => (
              <MetricCard
                key={summary.metric}
                summary={summary}
                vitals={vitals}
              />
            ))}
          </div>
        </div>

        <AlertPanel alerts={openAlerts} />
      </section>
    </AppLayout>
  );
}
