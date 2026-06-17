import { getAllVitals as getVitals } from "@/lib/server/vitals-db";

export async function loadVitals() {
  return getVitals();
}
