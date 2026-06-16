const DEFAULT_DEMO_PATIENT_ID = "P001";

export function normalizePatientId(patientId: string) {
  const trimmed = patientId.trim();

  if (!trimmed) {
    return trimmed;
  }

  if (trimmed.toLowerCase() === "patient-a") {
    return DEFAULT_DEMO_PATIENT_ID;
  }

  return trimmed.toUpperCase();
}
