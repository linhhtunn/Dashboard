import { mockPatients } from "@/lib/mock";
import { normalizePatientId } from "@/lib/patient-id";

export const patientRepository = {
  list() {
    return mockPatients;
  },

  findById(patientId: string) {
    const normalizedPatientId = normalizePatientId(patientId);
    return (
      mockPatients.find(
        (patient) => normalizePatientId(patient.id) === normalizedPatientId,
      ) ?? null
    );
  },
};
