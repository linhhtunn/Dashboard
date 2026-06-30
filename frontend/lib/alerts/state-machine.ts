import type { AlertSeverity, AlertWorkflowStatus } from "@/types";

export type AlertWorkflowAction =
  | "acknowledge"
  | "nurse_treat"
  | "needs_follow_up"
  | "mark_noise"
  | "doctor_confirm"
  | "doctor_confirm_noise";

const ALLOWED_ORIGINS: Record<AlertWorkflowAction, AlertWorkflowStatus[]> = {
  acknowledge: ["open"],
  nurse_treat: ["acknowledged"],
  needs_follow_up: ["acknowledged", "nurse_treated"],
  mark_noise: ["acknowledged"],
  doctor_confirm: ["nurse_treated", "needs_follow_up"],
  doctor_confirm_noise: ["suspected_noise"],
};

export function transitionAlertWorkflow(
  current: AlertWorkflowStatus,
  action: AlertWorkflowAction,
  severity: AlertSeverity,
): AlertWorkflowStatus {
  if (!ALLOWED_ORIGINS[action].includes(current)) {
    throw new Error(`Action ${action} is not allowed from ${current}.`);
  }

  switch (action) {
    case "acknowledge":
      return "acknowledged";
    case "nurse_treat":
      return "nurse_treated";
    case "needs_follow_up":
      return "needs_follow_up";
    case "mark_noise":
      return severity === "critical" ? "suspected_noise" : "noise";
    case "doctor_confirm":
      return "doctor_confirmed";
    case "doctor_confirm_noise":
      return "noise";
  }
}
