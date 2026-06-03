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
    <PanelCard className="px-3.5 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-[color:rgba(0,150,136,0.14)] bg-[color:rgba(0,150,136,0.06)] text-[color:var(--cs-teal)]">
            <ActivitySquare className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
              Triệu chứng gần đây
            </p>
            <p className="mt-1.5 text-sm text-[color:var(--cs-text)]">
              {symptomLabel}
            </p>
          </div>
        </div>

        <p className="text-sm text-[color:var(--cs-text-soft)]">
          {timestampLabel}
        </p>
      </div>
    </PanelCard>
  );
}
