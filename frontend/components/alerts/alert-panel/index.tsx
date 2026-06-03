import type { Alert } from "@/types";
import { AlertItem } from "../alert-item";

type AlertPanelProps = {
  alerts: Alert[];
};

export function AlertPanel({ alerts }: AlertPanelProps) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-panel p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-secondary">Recent alerts</p>
          <h2 className="mt-1 text-lg font-semibold text-text-strong">
            Abnormal signs to review
          </h2>
        </div>
        <span className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-text-body">
          {alerts.length} open
        </span>
      </div>

      {alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-center">
          <p className="text-sm font-medium text-text-strong">
            No recent abnormal signs
          </p>
          <p className="mt-1 text-sm text-text-body">Continue monitoring</p>
        </div>
      )}
    </section>
  );
}
