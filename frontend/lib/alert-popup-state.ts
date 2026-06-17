import type { Alert } from "@/types";

/** Alerts newer than this are treated as realtime. */
export const ALERT_REALTIME_WINDOW_MS = 5 * 60 * 1000;

/** Re-surface dismissed/viewed alerts after this interval if still unresolved. */
export const ALERT_STALE_REMINDER_MS = 15 * 60 * 1000;

const VIEWED_KEY = "care-signal-alert-views";
const DISMISSED_KEY = "care-signal-alert-dismissals";

export type AlertPopupState = {
  viewedAt: Record<string, string>;
  dismissedAt: Record<string, string>;
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
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function readAlertPopupState(): AlertPopupState {
  return {
    viewedAt: readMap(VIEWED_KEY),
    dismissedAt: readMap(DISMISSED_KEY),
  };
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

export function isRealtimeAlert(alert: Alert, now = Date.now()): boolean {
  return now - new Date(alert.timestamp).getTime() <= ALERT_REALTIME_WINDOW_MS;
}

export function shouldShowAlertPopup(
  alert: Alert,
  state: AlertPopupState,
  now = Date.now(),
): boolean {
  if (isAlertResolved(alert)) return false;

  const viewedAt = state.viewedAt[alert.id];
  const dismissedAt = state.dismissedAt[alert.id];

  if (!viewedAt && !dismissedAt) return true;

  if (isRealtimeAlert(alert, now)) {
    const alertTs = new Date(alert.timestamp).getTime();
    if (!viewedAt || alertTs > new Date(viewedAt).getTime()) return true;
  }

  const lastInteraction = dismissedAt ?? viewedAt;
  if (lastInteraction) {
    const elapsed = now - new Date(lastInteraction).getTime();
    if (elapsed >= ALERT_STALE_REMINDER_MS) return true;
  }

  return false;
}

const severityRank: Record<Alert["severity"], number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function pickAlertForPopup(
  alerts: Alert[],
  state: AlertPopupState,
  now = Date.now(),
): Alert | null {
  return (
    alerts
      .filter((alert) => shouldShowAlertPopup(alert, state, now))
      .sort((left, right) => {
        const severityDiff = severityRank[left.severity] - severityRank[right.severity];
        if (severityDiff !== 0) return severityDiff;
        return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
      })[0] ?? null
  );
}
