/**
 * Vitals are spread across multiple pipeline tables (no single unified table).
 * Priority when merging: clean_vitals → wearable streams → latest_sensor_values → baseline_signals.
 */
export const VITALS_SOURCE_TABLES = {
  clean_vitals: {
    description: "Team 2 cleaned vitals (contract schema)",
    fields: ["heart_rate", "respiratory_rate", "systolic_bp", "diastolic_bp", "spo2", "hrv"],
    timestamp: "timestamp",
    patientKey: "patient_id",
  },
  wearable_continuous: {
    description: "High-frequency HR + respiratory rate stream",
    fields: ["heart_rate", "respiratory_rate"],
    timestamp: "time",
    patientKey: "patient_id",
  },
  wearable_measurements: {
    description: "Discrete BP (blood_pressure) and SpO2 (spo2) measurements",
    fields: ["systolic_bp", "diastolic_bp", "spo2"],
    timestamp: "time",
    patientKey: "patient_id",
  },
  latest_sensor_values: {
    description: "Latest pivoted metric per patient (metric / value_numeric rows)",
    fields: ["heart_rate", "respiratory_rate", "systolic_bp", "diastolic_bp", "spo2"],
    timestamp: "last_measured_at",
    patientKey: "patient_id",
  },
  health_features: {
    description: "Aggregated window features (avg HR/RR, min SpO2)",
    fields: ["avg_heart_rate", "avg_respiratory_rate", "min_spo2"],
    timestamp: "time",
    patientKey: "patient_id",
  },
  patients: {
    description: "Baseline signals JSON on patient profile",
    fields: ["heart_rate", "respiratory_rate", "systolic_bp", "diastolic_bp", "spo2"],
    timestamp: "updated_at",
    patientKey: "patient_id",
    jsonColumn: "baseline_signals",
  },
} as const;

export type VitalsSourceTable = keyof typeof VITALS_SOURCE_TABLES;
