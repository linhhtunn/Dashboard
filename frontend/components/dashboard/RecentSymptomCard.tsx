import { ActivitySquare } from "lucide-react";

import { PanelCard } from "@/components/common/PanelCard";

type RecentSymptomCardProps = {
  symptomLabel: string;
  timestampLabel: string;
};

export function RecentSymptomCard({
  symptomLabel,
  timestampLabel,
}: RecentSymptomCardProps) {
  return (
    <PanelCard className="px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[1.1rem] border border-[color:rgba(0,150,136,0.14)] bg-[color:rgba(0,150,136,0.06)] text-[color:var(--cs-teal)]">
            <ActivitySquare className="h-6 w-6" />
          </div>

          <div>
            <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
              Trieu chung gan day
            </p>
            <p className="mt-2 text-[15px] text-[color:var(--cs-text)]">
              {symptomLabel}
            </p>
          </div>
        </div>

        <p className="text-sm text-[color:var(--cs-text-soft)]">{timestampLabel}</p>
      </div>
    </PanelCard>
  );
}
