CREATE UNIQUE INDEX IF NOT EXISTS uniq_raw_sensor_events_message_id
  ON raw_sensor_events (received_at, message_id)
  WHERE message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_wearable_continuous_message
  ON wearable_continuous (time, message_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_wearable_intervals_message
  ON wearable_intervals (time, message_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_wearable_measurements_message
  ON wearable_measurements (time, message_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_motion_batches_message
  ON motion_batches (window_start, message_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_ecg_measurements_message
  ON ecg_measurements (message_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_health_features_window
  ON health_features (time, patient_id, device_id, feature_window, source_window_start, source_window_end);

CREATE INDEX IF NOT EXISTS idx_wearable_continuous_patient_time
  ON wearable_continuous (patient_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_wearable_intervals_patient_time
  ON wearable_intervals (patient_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_wearable_measurements_patient_time
  ON wearable_measurements (patient_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_motion_batches_patient_window
  ON motion_batches (patient_id, window_start DESC);

CREATE INDEX IF NOT EXISTS idx_health_features_patient_time
  ON health_features (patient_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_ecg_measurements_patient_time
  ON ecg_measurements (patient_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_sleep_sessions_patient_date
  ON sleep_sessions (patient_id, sleep_date DESC);

CREATE INDEX IF NOT EXISTS idx_sleep_stage_intervals_session
  ON sleep_stage_intervals (sleep_session_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_ppi_patches_message
  ON ppi_patches (time, message_id);

CREATE INDEX IF NOT EXISTS idx_ppi_patches_patient_time
  ON ppi_patches (patient_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_activity_timeline_patient_time
  ON activity_timeline_segments (patient_id, start_time DESC);
