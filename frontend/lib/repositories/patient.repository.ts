import { mockPatients } from "@/lib/mock";

export const patientRepository = {
  list() {
    return mockPatients;
  },

  findById(patientId: string) {
    return mockPatients.find((patient) => patient.id === patientId) ?? null;
  },
};
