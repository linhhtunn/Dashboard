import { DashboardExperience } from "@/components/dashboard/DashboardExperience";

/** Full-viewport AI workspace — uses DashboardShell instead of ClinicalShell. */
export default function DashboardPage() {
  return (
    <div className="h-full min-h-0">
      <DashboardExperience />
    </div>
  );
}
