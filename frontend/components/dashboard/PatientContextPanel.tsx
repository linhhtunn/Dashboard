import { ConditionMedicationCard } from "@/components/dashboard/ConditionMedicationCard";
import { PatientSummaryHeader } from "@/components/dashboard/PatientSummaryHeader";
import { RecentSymptomCard } from "@/components/dashboard/RecentSymptomCard";
import { TopAlertsCard } from "@/components/dashboard/TopAlertsCard";
import { VitalsOverviewCard } from "@/components/dashboard/VitalsOverviewCard";

export function PatientContextPanel() {
  return (
    <div className="flex h-full flex-col gap-4">
      <PatientSummaryHeader />
      <ConditionMedicationCard />
      <RecentSymptomCard />
      <TopAlertsCard />
      <VitalsOverviewCard />
    </div>
  );
}