import { Clock3 } from "lucide-react";

import { PanelCard } from "@/components/common/PanelCard";
import type { Patient } from "@/types";

type ConditionMedicationCardProps = {
  patient: Patient;
};

const conditionLabels: Record<string, string> = {
  hypertension: "Tang huyet ap",
  type_2_diabetes: "Dai thao duong typ 2",
  ischemic_heart_disease: "Benh tim thieu mau cuc bo",
};

export function ConditionMedicationCard({
  patient,
}: ConditionMedicationCardProps) {
  const nextMedication = patient.medicationCycle[0];
  const visibleConditions = patient.underlyingConditionCodes.slice(0, 2);
  const hiddenConditions = patient.underlyingConditionCodes.slice(2);

  return (
    <PanelCard className="px-5 py-5">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1.2fr)_220px]">
        <div>
          <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
            Benh nen
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {visibleConditions.map((code) => (
              <span
                key={code}
                className="dashboard-glass-soft rounded-full px-3 py-2 text-sm text-[color:var(--cs-primary)]"
              >
                {conditionLabels[code] ?? code}
              </span>
            ))}
          </div>

          {hiddenConditions.length > 0 ? (
            <details className="dashboard-details mt-4 rounded-[1rem] border border-[color:rgba(13,71,161,0.12)] bg-[color:rgba(255,255,255,0.38)] px-3 py-3">
              <summary className="cursor-pointer text-sm font-medium text-[color:var(--cs-primary)]">
                Xem them {hiddenConditions.length} benh nen
              </summary>
              <div className="mt-3 flex flex-wrap gap-2">
                {hiddenConditions.map((code) => (
                  <span
                    key={code}
                    className="dashboard-glass-soft rounded-full px-3 py-2 text-sm text-[color:var(--cs-primary)]"
                  >
                    {conditionLabels[code] ?? code}
                  </span>
                ))}
              </div>
            </details>
          ) : null}
        </div>

        <div className="border-t dashboard-subtle-divider pt-5 md:border-l md:border-t-0 md:pl-5 md:pt-0">
          <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
            Lieu thuoc tiep theo
          </p>

          {nextMedication ? (
            <div className="dashboard-glass-soft mt-4 rounded-[1.15rem] px-4 py-4">
              <div className="flex items-center gap-2 text-[color:var(--cs-heading)]">
                <Clock3 className="h-4 w-4 text-[color:var(--cs-primary)]" />
                <span className="text-[1.4rem] font-semibold">
                  {nextMedication.schedule.vi}
                </span>
                <span className="text-sm text-[color:var(--cs-text-soft)]">
                  (sau 49 phut)
                </span>
              </div>

              <p className="mt-2 text-sm text-[color:var(--cs-text-soft)]">
                {nextMedication.medication.vi} {nextMedication.dosage}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </PanelCard>
  );
}
