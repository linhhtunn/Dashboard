import { mockMetricSummaries, mockVitals } from "@/lib/mock";

export const vitalRepository = {
  listByPatient(patientId: string) {
    return mockVitals.filter((vital) => vital.patientId === patientId);
  },

  listMetricSummaries(patientId: string) {
    const hasVitals = mockVitals.some((vital) => vital.patientId === patientId);
    return hasVitals ? mockMetricSummaries : [];
  },
};
