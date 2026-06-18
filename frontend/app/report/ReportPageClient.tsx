import { Suspense } from "react";

import ReportPageClient from "./ReportPageClient";

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-[color:var(--cs-text-soft)]">
          Loading report…
        </div>
      }
    >
      <ReportPageClient />
    </Suspense>
  );
}
