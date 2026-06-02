import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { DashboardPanelPlaceholder } from "@/components/dashboard/DashboardPanelPlaceholder";

export default function DashboardPage() {
  return (
    <DashboardShell
      topBar={<DashboardTopBar />}
      leftPanel={
        <DashboardPanelPlaceholder
          eyebrow="AI-first workspace"
          title="AI Clinical Assistant"
          description="Panel trái sẽ là không gian hội thoại kiểu Claude/GPT: conversation thread, suggested prompts, input composer, answer card có evidence và disclaimer."
          items={[
            "Conversation thread",
            "Suggested prompts",
            "AI answer card",
            "Evidence + disclaimer",
          ]}
        />
      }
      rightPanel={
        <DashboardPanelPlaceholder
          eyebrow="Patient context"
          title="Patient Summary Panel"
          description="Panel phải sẽ giữ toàn bộ ngữ cảnh lâm sàng để bác sĩ đối chiếu nhanh: profile, conditions, medication, alerts, vitals snapshot."
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