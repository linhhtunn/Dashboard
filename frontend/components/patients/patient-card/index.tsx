import Link from "next/link";
import type { Patient, PatientStatus, VitalSign } from "@/types";

export type PatientListItem = {
  patient: Patient;
  latestVital: VitalSign | null;
  openAlertCount: number;
};

type PatientCardProps = {
  item: PatientListItem;
};

const statusLabels: Record<PatientStatus, string> = {
  critical: "Critical",
  at_risk: "At Risk",
  recent_symptom: "Recent Symptom",
  healthy: "Healthy",
};

const statusClasses: Record<PatientStatus, string> = {
  critical: "border-red-200 bg-red-50 text-red-600",
  at_risk: "border-amber-200 bg-amber-50 text-amber-800",
  recent_symptom: "border-blue-700 bg-blue-700 text-white",
  healthy: "border-teal-200 bg-teal-50 text-teal-700",
};

function formatGender(gender: Patient["gender"]) {
  return gender.charAt(0).toUpperCase() + gender.slice(1);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatBloodPressure(vital: VitalSign | null) {
  return vital ? `${vital.systolicBp}/${vital.diastolicBp}` : "--";
}

export function PatientCard({ item }: PatientCardProps) {
  const { patient, latestVital, openAlertCount } = item;
  const symptomCount = patient.recentSymptoms.length;

  return (
    <article className="rounded-lg border border-border bg-panel p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1.4fr_0.8fr_1fr_0.9fr_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-text-strong">
              {patient.name}
            </h3>
            <span
              className={[
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                statusClasses[patient.status],
              ].join(" ")}
            >
              {statusLabels[patient.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-text-body">
            {patient.mrn} / {patient.id}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-text-body lg:block lg:space-y-1">
          <p>
            <span className="font-medium text-text-strong">{patient.age}</span>{" "}
            years
          </p>
          <p>{formatGender(patient.gender)}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-md bg-surface p-3 text-sm">
          <div>
            <p className="text-xs text-text-body">HR</p>
            <p className="font-semibold text-text-strong">
              {latestVital ? latestVital.heartRate : "--"}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-body">RR</p>
            <p className="font-semibold text-text-strong">
              {latestVital ? latestVital.respiratoryRate : "--"}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-body">BP</p>
            <p className="font-semibold text-text-strong">
              {formatBloodPressure(latestVital)}
            </p>
          </div>
        </div>

        <div className="space-y-1 text-sm text-text-body">
          <p>
            {symptomCount > 0
              ? `${symptomCount} recent symptom${symptomCount > 1 ? "s" : ""}`
              : "No recent symptoms"}
          </p>
          <p>{openAlertCount} open alert{openAlertCount === 1 ? "" : "s"}</p>
          <p>Updated {formatDateTime(patient.lastUpdated)}</p>
        </div>

        <Link
          href={`/patients/${patient.id}`}
          className="inline-flex h-10 items-center justify-center rounded-md border border-primary/20 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/25"
        >
          View
        </Link>
      </div>
    </article>
  );
}
