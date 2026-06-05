import { mockAlerts } from "@/lib/mock";
import { normalizePatientId } from "@/lib/patient-id";

export const alertRepository = {
  list() {
    return mockAlerts;
  },

  listOpen() {
    return mockAlerts.filter((alert) => !alert.acknowledged);
  },

  listByPatient(patientId: string) {
    const normalizedPatientId = normalizePatientId(patientId);
    return mockAlerts.filter(
      (alert) => normalizePatientId(alert.patientId) === normalizedPatientId,
    );
  },
};
