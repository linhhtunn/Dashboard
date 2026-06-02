import { AppLayout } from "../app-layout";
import { PatientTable, type PatientListItem } from "@/components/patients";
import { alertRepository } from "@/lib/repositories/alert.repository";
import { patientRepository } from "@/lib/repositories/patient.repository";
import { vitalRepository } from "@/lib/repositories/vital.repository";

function getLatestVital(patientId: string) {
  const vitals = vitalRepository.listByPatient(patientId);

  return (
    [...vitals].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )[0] ?? null
  );
}

export default function PatientsPage() {
  const openAlerts = alertRepository.listOpen();
  const items: PatientListItem[] = patientRepository.list().map((patient) => ({
    patient,
    latestVital: getLatestVital(patient.id),
    openAlertCount: openAlerts.filter((alert) => alert.patientId === patient.id)
      .length,
  }));

  return (
    <AppLayout>
      <section className="space-y-6">
        <div>
          <p className="text-sm font-medium text-secondary">Patients</p>
          <h1 className="mt-1 text-2xl font-semibold leading-8 text-text-strong">
            Priority patient list
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-body">
            Review patients by care priority, recent vitals, and monitoring
            signals.
          </p>
        </div>

        <PatientTable items={items} />
      </section>
    </AppLayout>
  );
}
