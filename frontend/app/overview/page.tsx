import { Suspense } from "react";

import { ClinicalShell } from "@/components/clinical/ClinicalShell";
import { ReportDashboard } from "@/components/report/ReportDashboard";

export default function OverviewPage() {
  return (
    <ClinicalShell viewportLocked>
      <Suspense
        fallback={
          <div className="dashboard-surface h-[480px] animate-pulse rounded-[1rem]" />
        }
      >
        <ReportDashboard />
      </Suspense>
    </ClinicalShell>
  );
}
