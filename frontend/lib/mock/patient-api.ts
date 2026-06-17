export {
  enrichAlertDto,
  getPatientDtoById as getMockPatientById,
  getPatientVitalsDto as getMockPatientVitalsById,
  listAlerts as listMockAlerts,
  listPatientAlerts as listMockPatientAlerts,
  listPatientItems as listMockPatientItems,
  type AlertDto as MockAlertDto,
  type PatientDto as MockPatientDto,
  type PatientListItemDto as MockPatientListItemDto,
  type PatientVitalsDto as MockPatientVitalsDto,
  type VitalDto as MockVitalDto,
} from "@/lib/server/patient-service";
