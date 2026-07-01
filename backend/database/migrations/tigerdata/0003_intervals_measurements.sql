-- Steps (60 s) and stress (60 s) interval windows.
-- PPI is stored separately in ppi_patches.
CREATE TABLE IF NOT EXISTS wearable_intervals (
  time timestamptz NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  message_id text NOT NULL,
  patient_id text NOT NULL,
  device_id text NOT NULL,
  interval_type text NOT NULL CHECK (interval_type IN ('steps', 'stress')),
  interval_seconds integer NOT NULL DEFAULT 60 CHECK (interval_seconds > 0),
  steps_count integer,
  steps_rate_per_min integer,
  activity_type text,
  stress_score integer,
  stress_level text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (window_start < window_end),
  CHECK (steps_count IS NULL OR steps_count >= 0),
  CHECK (stress_score IS NULL OR stress_score BETWEEN 0 AND 100),
  CHECK (stress_level IS NULL OR stress_level IN ('rest', 'low', 'medium', 'high'))
);

-- Raw beat-to-beat PPI intervals: 15 s patch, roughly 15-25 beats per window.
-- Team 2/3 derive HRV (RMSSD, SDNN, etc.) from ppi_intervals_ms.
CREATE TABLE IF NOT EXISTS ppi_patches (
  time timestamptz NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  message_id text NOT NULL,
  patient_id text NOT NULL,
  device_id text NOT NULL,
  interval_seconds integer NOT NULL DEFAULT 15 CHECK (interval_seconds > 0),
  ppi_intervals_ms jsonb NOT NULL DEFAULT '[]'::jsonb,
  beat_count integer GENERATED ALWAYS AS (jsonb_array_length(ppi_intervals_ms)) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (window_start < window_end)
);

CREATE TABLE IF NOT EXISTS wearable_measurements (
  time timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  message_id text NOT NULL,
  patient_id text NOT NULL,
  device_id text NOT NULL,
  measurement_type text NOT NULL CHECK (measurement_type IN ('blood_pressure', 'spo2', 'battery')),
  systolic_bp integer,
  diastolic_bp integer,
  spo2 integer,
  battery_level integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (systolic_bp IS NULL OR systolic_bp BETWEEN 60 AND 260),
  CHECK (diastolic_bp IS NULL OR diastolic_bp BETWEEN 30 AND 180),
  CHECK (systolic_bp IS NULL OR diastolic_bp IS NULL OR systolic_bp > diastolic_bp),
  CHECK (spo2 IS NULL OR spo2 BETWEEN 0 AND 100),
  CHECK (battery_level IS NULL OR battery_level BETWEEN 0 AND 100)
);
