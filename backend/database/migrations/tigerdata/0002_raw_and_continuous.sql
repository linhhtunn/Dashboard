CREATE TABLE IF NOT EXISTS raw_sensor_events (
  time timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  message_id text,
  patient_id text,
  device_id text,
  stream_name text NOT NULL,
  event_type text,
  trigger_type text,
  raw_payload jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wearable_continuous (
  time timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  message_id text NOT NULL,
  patient_id text NOT NULL,
  device_id text NOT NULL,
  heart_rate integer,
  respiratory_rate integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (heart_rate IS NULL OR heart_rate BETWEEN 20 AND 260),
  CHECK (respiratory_rate IS NULL OR respiratory_rate BETWEEN 4 AND 60)
);
