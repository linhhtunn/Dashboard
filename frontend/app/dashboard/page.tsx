import { AIWorkspacePanel } from "@/components/dashboard/AIWorkspacePanel";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PatientContextPanel } from "@/components/dashboard/PatientContextPanel";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";

export default function DashboardPage() {
  return (
    <DashboardShell
      activeNav="dashboard"
      topBar={<DashboardTopBar />}
      leftPanel={<AIWorkspacePanel />}
      rightPanel={<PatientContextPanel />}
    />
  );
}
