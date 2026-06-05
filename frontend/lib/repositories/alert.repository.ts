import { mockAlerts } from "@/lib/mock";

export const alertRepository = {
  list() {
    return mockAlerts;
  },

  listOpen() {
    return mockAlerts.filter((alert) => !alert.acknowledged);
  },

  listByPatient(patientId: string) {
    return mockAlerts.filter((alert) => alert.patientId === patientId);
  },
};
