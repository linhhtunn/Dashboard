import { getAlerts } from "@/lib/server/clinical-store";

export async function loadAlerts() {
  return getAlerts();
}
