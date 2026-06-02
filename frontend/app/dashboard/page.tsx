import { AIWorkspacePanel } from "@/components/dashboard/AIWorkspacePanel";
import { DashboardPanelPlaceholder } from "@/components/dashboard/DashboardPanelPlaceholder";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";

export default function DashboardPage() {
  return (
    <DashboardShell
      topBar={<DashboardTopBar />}
      leftPanel={<AIWorkspacePanel />}
      rightPanel={
        <DashboardPanelPlaceholder
          eyebrow="Patient context"
          title="Patient Summary Panel"
          description="Panel phai se giu toan bo ngu canh lam sang de bac si doi chieu nhanh: profile, conditions, medication, alerts, va vitals snapshot."
          items={[
            "Patient profile header",
            "Underlying conditions",
            "Top alerts",
            "Vitals overview",
          ]}
          tone="secondary"
        />
      }
    />
  );
}
