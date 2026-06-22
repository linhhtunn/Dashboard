import { ClinicalShell } from "@/components/clinical/ClinicalShell";
import { PersonaGuard } from "@/components/clinical/PersonaGuard";
import { DailyReportDashboard } from "@/components/report/DailyReportDashboard";

export default function DailyReportPage() {
  return (
    <PersonaGuard require="doctor">
      <ClinicalShell>
        <DailyReportDashboard />
      </ClinicalShell>
    </PersonaGuard>
  );
}
