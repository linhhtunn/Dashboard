import type { Alert } from "@/types";

const VIEWED_KEY = "care-signal-alert-views";
const DISMISSED_KEY = "care-signal-alert-dismissals";
const BASELINE_KEY = "care-signal-alert-baseline-at";

export type AlertPopupState = {
  viewedAt: Record<string, string>;
  dismissedAt: Record<string, string>;
  baselineAt?: string;
};

function readMap(key: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeMap(key: string, value: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures; popup state is best-effort client memory.
  }
}

function readValue(key: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeValue(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures; popup state is best-effort client memory.
  }
}

export function readAlertPopupState(): AlertPopupState {
  return {
    viewedAt: readMap(VIEWED_KEY),
    dismissedAt: readMap(DISMISSED_KEY),
    baselineAt: readValue(BASELINE_KEY),
  };
}

export function markCurrentAlertsViewed(alerts: Alert[]) {
  if (typeof window === "undefined") return;

  const now = new Date().toISOString();
  const viewedAt = readMap(VIEWED_KEY);
  for (const alert of alerts) {
    if (!isAlertResolved(alert)) viewedAt[alert.id] = now;
  }

  writeMap(VIEWED_KEY, viewedAt);
  writeValue(BASELINE_KEY, now);
}

export function ensureAlertPopupBaseline(alerts: Alert[]) {
  if (typeof window === "undefined") return false;
  if (readValue(BASELINE_KEY)) return false;

  markCurrentAlertsViewed(alerts);
  return true;
}

export function markAlertViewed(alertId: string) {
  const viewedAt = readMap(VIEWED_KEY);
  viewedAt[alertId] = new Date().toISOString();
  writeMap(VIEWED_KEY, viewedAt);
}

export function dismissAlertTemporarily(alertId: string) {
  const dismissedAt = readMap(DISMISSED_KEY);
  dismissedAt[alertId] = new Date().toISOString();
  writeMap(DISMISSED_KEY, dismissedAt);
  markAlertViewed(alertId);
}

export function clearAlertPopupState(alertId: string) {
  const viewedAt = readMap(VIEWED_KEY);
  const dismissedAt = readMap(DISMISSED_KEY);
  delete viewedAt[alertId];
  delete dismissedAt[alertId];
  writeMap(VIEWED_KEY, viewedAt);
  writeMap(DISMISSED_KEY, dismissedAt);
}

export function isAlertResolved(alert: Alert): boolean {
  return alert.workflowStatus === "doctor_confirmed";
}

export function shouldShowAlertPopup(
  alert: Alert,
  state: AlertPopupState,
): boolean {
  if (isAlertResolved(alert)) return false;

  const viewedAt = state.viewedAt[alert.id];
  const dismissedAt = state.dismissedAt[alert.id];

  return !viewedAt && !dismissedAt;
}

const severityRank: Record<Alert["severity"], number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function pickAlertForPopup(
  alerts: Alert[],
  state: AlertPopupState,
): Alert | null {
  return (
    alerts
      .filter((alert) => shouldShowAlertPopup(alert, state))
      .sort((left, right) => {
        const severityDiff = severityRank[left.severity] - severityRank[right.severity];
        if (severityDiff !== 0) return severityDiff;
        return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
      })[0] ?? null
  );
}
