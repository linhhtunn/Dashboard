import { DashboardPanelPlaceholder } from "@/components/dashboard/DashboardPanelPlaceholder";

export function PatientContextPanel() {
  return (
    <DashboardPanelPlaceholder
      eyebrow="Patient context"
      title="Patient Summary Panel"
      description="Panel phai se duoc tach thanh profile, conditions, alerts, va vitals overview o commit tiep theo."
      items={[
        "Patient profile header",
        "Underlying conditions",
        "Top alerts",
        "Vitals overview",
      ]}
      tone="secondary"
    />
  );
}
