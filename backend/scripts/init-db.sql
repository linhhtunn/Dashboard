CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS ingestion_vitals (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  deduplication_key TEXT NOT NULL UNIQUE,
  patient_token TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  heart_rate DOUBLE PRECISION,
  respiratory_rate DOUBLE PRECISION,
  spo2 DOUBLE PRECISION,
  systolic_bp DOUBLE PRECISION,
  diastolic_bp DOUBLE PRECISION,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ingestion_vitals_patient_time_idx
  ON ingestion_vitals (patient_token, observed_at DESC);

CREATE TABLE IF NOT EXISTS ingestion_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  deduplication_key TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
