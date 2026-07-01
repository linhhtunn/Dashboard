-- Dev/test seed data for Supabase app database.
-- Run only in local/dev environments after Supabase migrations are applied.

INSERT INTO public.patients (
  patient_id,
  mimic_subject_id,
  name,
  age,
  weight_kg,
  gender,
  age_group,
  pregnancy_status,
  lifestyle,
  risk_factors,
  activity_level,
  medical_history,
  health_status,
  baseline_signals
)
VALUES (
  'P001',
  10009035,
  'Nguyen Minh Quan',
  28,
  72,
  'male',
  'young',
  'none',
  'moderately_active',
  ARRAY['heart_disease_risk'],
  'medium',
  'Mitral valve disorder; post-procedure monitoring',
  'WARNING',
  '{
    "heart_rate": 78,
    "respiratory_rate": 16.0,
    "ppi_resting_mean_ms": 769,
    "ppi_resting_std_ms": 15,
    "stress_score": 38,
    "systolic_bp": 118,
    "diastolic_bp": 78,
    "spo2": 97,
    "hrv_rmssd_morning": 48,
    "ecg_rhythm": "sinus_rhythm"
  }'::jsonb
)
ON CONFLICT (patient_id) DO UPDATE SET
  mimic_subject_id = EXCLUDED.mimic_subject_id,
  name = EXCLUDED.name,
  age = EXCLUDED.age,
  weight_kg = EXCLUDED.weight_kg,
  gender = EXCLUDED.gender,
  age_group = EXCLUDED.age_group,
  pregnancy_status = EXCLUDED.pregnancy_status,
  lifestyle = EXCLUDED.lifestyle,
  risk_factors = EXCLUDED.risk_factors,
  activity_level = EXCLUDED.activity_level,
  medical_history = EXCLUDED.medical_history,
  health_status = EXCLUDED.health_status,
  baseline_signals = EXCLUDED.baseline_signals;

INSERT INTO public.patient_lab_results (
  lab_result_id,
  patient_id,
  sampled_at,
  panel_type,
  test_name,
  value_numeric,
  unit
)
VALUES
  ('LAB_P001_20260609_GLUCOSE', 'P001', '2026-06-09', 'chemistry', 'glucose', 124, 'mg/dL'),
  ('LAB_P001_20260609_CREATININE', 'P001', '2026-06-09', 'chemistry', 'creatinine', 0.9, 'mg/dL'),
  ('LAB_P001_20260609_SODIUM', 'P001', '2026-06-09', 'chemistry', 'sodium', 138, 'mEq/L'),
  ('LAB_P001_20260609_POTASSIUM', 'P001', '2026-06-09', 'chemistry', 'potassium', 4.1, 'mEq/L'),
  ('LAB_P001_20260609_CHLORIDE', 'P001', '2026-06-09', 'chemistry', 'chloride', 102, 'mEq/L'),
  ('LAB_P001_20260609_BICARBONATE', 'P001', '2026-06-09', 'chemistry', 'bicarbonate', 29, 'mEq/L'),
  ('LAB_P001_20260609_UREA_NITROGEN', 'P001', '2026-06-09', 'chemistry', 'urea_nitrogen', 14, 'mg/dL'),
  ('LAB_P001_20260609_CALCIUM', 'P001', '2026-06-09', 'chemistry', 'calcium', 8.7, 'mg/dL'),
  ('LAB_P001_20260609_ALT', 'P001', '2026-06-09', 'chemistry', 'alt', 16, 'IU/L'),
  ('LAB_P001_20260609_AST', 'P001', '2026-06-09', 'chemistry', 'ast', 18, 'IU/L'),
  ('LAB_P001_20260609_BILIRUBIN_TOTAL', 'P001', '2026-06-09', 'chemistry', 'bilirubin_total', 0.5, 'mg/dL'),
  ('LAB_P001_20260609_HEMOGLOBIN', 'P001', '2026-06-09', 'hematology', 'hemoglobin', 11.4, 'g/dL'),
  ('LAB_P001_20260609_HEMATOCRIT', 'P001', '2026-06-09', 'hematology', 'hematocrit', 32.8, 'percent'),
  ('LAB_P001_20260609_WBC', 'P001', '2026-06-09', 'hematology', 'white_blood_cells', 11.9, 'K/uL'),
  ('LAB_P001_20260609_PLATELETS', 'P001', '2026-06-09', 'hematology', 'platelet_count', 186, 'K/uL'),
  ('LAB_P001_20260609_INR', 'P001', '2026-06-09', 'hematology', 'inr', 1.3, null),
  ('LAB_P001_20260609_PTT', 'P001', '2026-06-09', 'hematology', 'ptt', 28.4, 'sec')
ON CONFLICT (patient_id, sampled_at, panel_type, test_name) DO UPDATE SET
  value_numeric = EXCLUDED.value_numeric,
  unit = EXCLUDED.unit;

INSERT INTO public.clinical_staff (staff_id, full_name, email, department, role)
VALUES
  ('S001', 'Tran Thi Lan', 'lan.tran@example.local', 'Cardiology', 'doctor'),
  ('S002', 'Pham Minh Anh', 'anh.pham@example.local', 'Cardiology', 'nurse')
ON CONFLICT (staff_id) DO NOTHING;

INSERT INTO public.staff_shifts (shift_id, staff_id, department, shift_role, shift_start, shift_end, status)
VALUES
  ('SHIFT_20260611_DAY_S001', 'S001', 'Cardiology', 'primary', '2026-06-11T07:00:00+07:00', '2026-06-11T19:00:00+07:00', 'active'),
  ('SHIFT_20260611_DAY_S002', 'S002', 'Cardiology', 'backup', '2026-06-11T07:00:00+07:00', '2026-06-11T19:00:00+07:00', 'active')
ON CONFLICT (shift_id) DO NOTHING;

INSERT INTO public.devices (device_id, patient_id, device_type, vendor, model, external_device_key)
VALUES ('DEV_P001_WATCH', 'P001', 'simulator', 'health-app-simulator', 'wearable-v1', 'SIM_WATCH_P001')
ON CONFLICT (device_id) DO UPDATE SET
  patient_id = EXCLUDED.patient_id,
  external_device_key = EXCLUDED.external_device_key;

INSERT INTO public.device_sensors (sensor_id, device_id, sensor_type, label, unit, stream_name, sampling_mode)
VALUES
  ('SEN_P001_HR', 'DEV_P001_WATCH', 'heart_rate', 'Heart rate', 'bpm', 'wearable_continuous', 'continuous'),
  ('SEN_P001_RR', 'DEV_P001_WATCH', 'respiratory_rate', 'Respiratory rate', 'breaths_per_min', 'wearable_continuous', 'continuous'),
  ('SEN_P001_SPO2', 'DEV_P001_WATCH', 'spo2', 'SpO2', 'percent', 'wearable_measurements', 'triggered'),
  ('SEN_P001_STRESS', 'DEV_P001_WATCH', 'stress', 'Stress score', 'score', 'wearable_intervals', 'windowed')
ON CONFLICT (device_id, stream_name, sensor_type) DO NOTHING;

INSERT INTO public.scenario_definitions (scenario_id, scenario_type, description, expected_signals)
VALUES (
  'SCN_LOW_SPO2_001',
  'low_spo2',
  'Simulated oxygen desaturation event for dashboard and alert validation.',
  '{"spo2": {"min_expected": 88}, "duration_seconds": 120}'::jsonb
)
ON CONFLICT (scenario_id) DO NOTHING;

INSERT INTO public.scenario_ground_truth (
  ground_truth_id,
  scenario_id,
  patient_id,
  event_type,
  ground_truth_label,
  expected_severity,
  event_start,
  event_end,
  description
)
VALUES (
  'GT_SCN_LOW_SPO2_001_P001',
  'SCN_LOW_SPO2_001',
  'P001',
  'low_spo2',
  'abnormal',
  'high',
  '2026-06-11T10:00:00+07:00',
  '2026-06-11T10:02:00+07:00',
  'Expected high severity low SpO2 alert.'
)
ON CONFLICT (ground_truth_id) DO NOTHING;
