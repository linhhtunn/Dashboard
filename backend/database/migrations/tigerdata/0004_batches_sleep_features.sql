CREATE TABLE IF NOT EXISTS motion_batches (
  time timestamptz NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  message_id text NOT NULL,
  patient_id text NOT NULL,
  device_id text NOT NULL,
  motion_sampling_rate_hz integer NOT NULL CHECK (motion_sampling_rate_hz > 0),
  motion_points jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (window_start < window_end)
);

CREATE TABLE IF NOT EXISTS ecg_measurements (
  measurement_id text PRIMARY KEY,
  time timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  message_id text NOT NULL,
  patient_id text NOT NULL,
  device_id text NOT NULL,
  ecg_result text,
  ecg_rhythm text,
  ecg_abnormal_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ecg_lead text,
  ecg_unit text,
  ecg_sampling_rate_hz integer CHECK (ecg_sampling_rate_hz IS NULL OR ecg_sampling_rate_hz > 0),
  ecg_duration_seconds integer CHECK (ecg_duration_seconds IS NULL OR ecg_duration_seconds > 0),
  ecg_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sleep_sessions (
  sleep_session_id text PRIMARY KEY,
  patient_id text NOT NULL,
  device_id text,
  sleep_date date NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  sleep_duration_min integer NOT NULL CHECK (sleep_duration_min >= 0),
  sleep_score integer CHECK (sleep_score IS NULL OR sleep_score BETWEEN 0 AND 100),
  sleep_quality text,
  detail jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_time < end_time)
);

CREATE TABLE IF NOT EXISTS sleep_stage_intervals (
  stage_id text PRIMARY KEY,
  sleep_session_id text NOT NULL REFERENCES sleep_sessions(sleep_session_id) ON DELETE CASCADE,
  patient_id text NOT NULL,
  device_id text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  state text NOT NULL CHECK (state IN ('awake', 'light', 'deep', 'rem')),
  duration_min integer NOT NULL CHECK (duration_min >= 0),
  CHECK (start_time < end_time)
);

CREATE TABLE IF NOT EXISTS daily_hrv_metrics (
  patient_id text NOT NULL,
  date date NOT NULL,
  measured_at timestamptz NOT NULL,
  hrv_rmssd_morning integer NOT NULL CHECK (hrv_rmssd_morning >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (patient_id, date)
);

CREATE TABLE IF NOT EXISTS health_features (
  time timestamptz NOT NULL,
  patient_id text NOT NULL,
  device_id text NOT NULL,
  feature_window text NOT NULL,
  source_window_start timestamptz NOT NULL,
  source_window_end timestamptz NOT NULL,
  avg_heart_rate double precision,
  max_heart_rate double precision,
  avg_respiratory_rate double precision,
  min_spo2 double precision,
  avg_stress_score double precision,
  ppi_rmssd_ms_avg double precision,
  steps_count integer,
  acc_magnitude_max double precision,
  gyro_magnitude_max double precision,
  anomaly_score double precision,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source_window_start < source_window_end)
);

-- Activity segments exported by simulator (kind: sleep | activity; state: deep | light | rem | awake | sitting | walking | …)
CREATE TABLE IF NOT EXISTS activity_timeline_segments (
  time timestamptz NOT NULL,
  patient_id text NOT NULL,
  device_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('sleep', 'activity')),
  state text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration_minutes double precision NOT NULL CHECK (duration_minutes >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_time < end_time)
);

CREATE TABLE IF NOT EXISTS latest_sensor_values (
  patient_id text NOT NULL,
  device_id text NOT NULL,
  metric text NOT NULL,
  value_numeric double precision,
  value_text text,
  unit text,
  last_measured_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  stream_name text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (patient_id, device_id, metric)
);
