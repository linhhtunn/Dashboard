import { getPatients } from "@/lib/server/clinical-store";

export async function loadPatients() {
  return getPatients();
}
