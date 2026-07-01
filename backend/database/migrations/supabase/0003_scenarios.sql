CREATE TABLE IF NOT EXISTS public.scenario_definitions (
  scenario_id text PRIMARY KEY,
  scenario_type text NOT NULL,
  description text,
  expected_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ground-truth episode log from simulator output (abnormal_episodes.json per patient).
-- Each row = one contiguous abnormal episode with exact timestamps, HR peaks,
-- estimated BP/SpO2 delta ranges, and severity label.
-- Used by Team 3 as labelled ground truth for anomaly model evaluation.
-- DROP first to replace the old event-based schema (ground_truth_label, event_start, event_end).
DROP TABLE IF EXISTS public.scenario_ground_truth;
CREATE TABLE public.scenario_ground_truth (
  episode_id text PRIMARY KEY,
  patient_id text NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  device_id text REFERENCES public.devices(device_id) ON DELETE SET NULL,
  episode_type text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration_seconds integer NOT NULL CHECK (duration_seconds > 0),
  duration_minutes double precision NOT NULL CHECK (duration_minutes > 0),
  peak_heart_rate integer CHECK (peak_heart_rate IS NULL OR peak_heart_rate BETWEEN 20 AND 300),
  min_heart_rate integer CHECK (min_heart_rate IS NULL OR min_heart_rate BETWEEN 20 AND 300),
  systolic_bp_delta_min integer,
  systolic_bp_delta_max integer,
  diastolic_bp_delta_min integer,
  diastolic_bp_delta_max integer,
  spo2_delta_min double precision,
  spo2_delta_max double precision,
  severity text CHECK (severity IS NULL OR severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'abnormal' CHECK (status IN ('normal', 'abnormal')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_time < end_time)
);

-- Fault injection log from simulator output (fault_log.json per patient).
-- Records every synthetic data-quality fault injected into a wearable stream.
-- Used by Team 2/3 to verify their validation / anomaly-detection pipelines.
CREATE TABLE IF NOT EXISTS public.wearable_fault_log (
  fault_id bigserial PRIMARY KEY,
  patient_id text NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  device_id text REFERENCES public.devices(device_id) ON DELETE SET NULL,
  stream_name text NOT NULL,
  fault_type text NOT NULL,
  source_message_id text,
  detail text,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
