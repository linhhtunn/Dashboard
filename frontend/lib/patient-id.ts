import { MVP_BACKEND_PATIENT_ID } from "@/lib/ai/mvp-demo";

export function normalizePatientId(patientId: string) {
  const trimmed = patientId.trim();

  if (!trimmed) {
    return trimmed;
  }

  if (trimmed.toLowerCase() === "patient-a") {
    return MVP_BACKEND_PATIENT_ID;
  }

  return trimmed.toUpperCase();
}
