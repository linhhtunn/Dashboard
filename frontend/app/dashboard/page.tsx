import { AIWorkspacePanel } from "@/components/dashboard/AIWorkspacePanel";
import { DashboardPanelPlaceholder } from "@/components/dashboard/DashboardPanelPlaceholder";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";

export default function DashboardPage() {
  return (
    <DashboardShell
      activeNav="dashboard"
      topBar={<DashboardTopBar />}
      leftPanel={<AIWorkspacePanel />}
      rightPanel={
        <DashboardPanelPlaceholder
          eyebrow="Patient context"
          title="Patient Summary Panel"
          description="Panel phai se giu toan bo ngu canh lam sang de bac si doi chieu nhanh: profile, conditions, medication, alerts, vitals snapshot, va evidence cho AI summary."
          items={[
            "Patient profile header",
            "Underlying conditions",
            "Top alerts",
            "Vitals overview",
            "Evidence for AI summary",
          ]}
          tone="secondary"
        />
      }
    />
  );
}
