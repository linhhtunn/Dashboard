import { getVitals } from "@/lib/server/clinical-store";

export async function loadVitals() {
  return getVitals();
}
