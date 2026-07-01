CREATE INDEX IF NOT EXISTS idx_patients_health_status
  ON public.patients (health_status);

CREATE INDEX IF NOT EXISTS idx_patient_lab_results_patient_sampled
  ON public.patient_lab_results (patient_id, sampled_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_lab_results_test_name
  ON public.patient_lab_results (test_name);

CREATE INDEX IF NOT EXISTS idx_staff_shifts_active_window
  ON public.staff_shifts (status, shift_start, shift_end);

CREATE INDEX IF NOT EXISTS idx_devices_patient
  ON public.devices (patient_id);

CREATE INDEX IF NOT EXISTS idx_device_sensors_device_stream
  ON public.device_sensors (device_id, stream_name);

CREATE INDEX IF NOT EXISTS idx_alerts_patient_time
  ON public.alerts (patient_id, alert_time DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_status_time
  ON public.alerts (status, alert_time DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_shift_status
  ON public.alerts (shift_id, status, alert_time DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_dedup_key
  ON public.alerts (dedup_key)
  WHERE dedup_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scenario_ground_truth_patient_time
  ON public.scenario_ground_truth (patient_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_scenario_ground_truth_type
  ON public.scenario_ground_truth (episode_type, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_wearable_fault_log_patient_time
  ON public.wearable_fault_log (patient_id, occurred_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_wearable_fault_log_source
  ON public.wearable_fault_log (patient_id, source_message_id)
  WHERE source_message_id IS NOT NULL;
