-- Portal clinical layer for CareSignal frontend
-- Maps backend tables (patients, alerts) + portal tables for UI-specific data

-- Backend pipeline tables (contract schema)
CREATE TABLE IF NOT EXISTS clean_vitals (
  id BIGSERIAL PRIMARY KEY,
  patient_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  heart_rate DOUBLE PRECISION,
  hrv DOUBLE PRECISION,
  systolic_bp DOUBLE PRECISION,
  diastolic_bp DOUBLE PRECISION,
  spo2 DOUBLE PRECISION,
  acc_x DOUBLE PRECISION,
  acc_y DOUBLE PRECISION,
  acc_z DOUBLE PRECISION,
  gyro_x DOUBLE PRECISION,
  gyro_y DOUBLE PRECISION,
  gyro_z DOUBLE PRECISION,
  data_state TEXT DEFAULT 'VALID',
  scenario_id TEXT
);

CREATE INDEX IF NOT EXISTS clean_vitals_patient_ts_idx
  ON clean_vitals (patient_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS health_alerts (
  alert_id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  scenario_id TEXT,
  alert_type TEXT,
  health_status TEXT,
  severity TEXT,
  confidence DOUBLE PRECISION,
  evidence JSONB DEFAULT '[]'::jsonb,
  message TEXT
);

CREATE INDEX IF NOT EXISTS health_alerts_patient_ts_idx
  ON health_alerts (patient_id, timestamp DESC);

-- Portal extension tables (frontend seed / workflow)
CREATE TABLE IF NOT EXISTS portal_patients (
  id TEXT PRIMARY KEY,
  mrn TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  status TEXT NOT NULL,
  ward_code TEXT NOT NULL,
  department_code TEXT NOT NULL,
  bed TEXT,
  underlying_condition_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  recent_symptom_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  medications JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_updated TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS portal_alerts (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  score DOUBLE PRECISION,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  workflow_status TEXT NOT NULL DEFAULT 'open',
  assigned_floor_nurse_id TEXT,
  assigned_zone_code TEXT,
  noise_note TEXT,
  treatment JSONB
);

CREATE TABLE IF NOT EXISTS portal_vitals (
  id BIGSERIAL PRIMARY KEY,
  patient_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  heart_rate DOUBLE PRECISION,
  respiratory_rate DOUBLE PRECISION,
  systolic_bp DOUBLE PRECISION,
  diastolic_bp DOUBLE PRECISION,
  spo2 DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS portal_vitals_patient_ts_idx
  ON portal_vitals (patient_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS portal_staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  zone_code TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS portal_shifts (
  id TEXT PRIMARY KEY,
  ward_code TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  coordinator_id TEXT
);

CREATE TABLE IF NOT EXISTS portal_shift_staff (
  shift_id TEXT NOT NULL REFERENCES portal_shifts(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL REFERENCES portal_staff(id) ON DELETE CASCADE,
  PRIMARY KEY (shift_id, staff_id)
);

CREATE TABLE IF NOT EXISTS portal_schedule_slots (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES portal_staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  band TEXT NOT NULL,
  zone_code TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS portal_operator_sessions (
  role TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL,
  actor_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS portal_alert_action_logs (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unified read view: backend patients + portal profile
CREATE OR REPLACE VIEW v_portal_patients AS
SELECT
  COALESCE(pp.id, p.patient_id) AS id,
  COALESCE(pp.mrn, p.patient_id) AS mrn,
  COALESCE(pp.name, p.name) AS name,
  COALESCE(pp.age, p.age) AS age,
  COALESCE(pp.gender, p.gender) AS gender,
  COALESCE(
    pp.status,
    CASE lower(COALESCE(p.status, ''))
      WHEN 'normal' THEN 'healthy'
      WHEN 'warning' THEN 'at_risk'
      WHEN 'abnormal' THEN 'at_risk'
      WHEN 'critical' THEN 'critical'
      ELSE COALESCE(NULLIF(p.status, ''), 'healthy')
    END
  ) AS status,
  COALESCE(pp.ward_code, 'general_ward') AS ward_code,
  COALESCE(pp.department_code, 'internal_medicine') AS department_code,
  pp.bed,
  COALESCE(pp.underlying_condition_codes, '[]'::jsonb) AS underlying_condition_codes,
  COALESCE(pp.recent_symptom_codes, '[]'::jsonb) AS recent_symptom_codes,
  COALESCE(pp.medications, '[]'::jsonb) AS medications,
  COALESCE(pp.last_updated, now()) AS last_updated
FROM portal_patients pp
FULL OUTER JOIN patients p ON pp.id = p.patient_id;

-- RLS
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clean_vitals','health_alerts','portal_patients','portal_alerts','portal_vitals',
    'portal_staff','portal_shifts','portal_shift_staff','portal_schedule_slots',
    'portal_operator_sessions','portal_alert_action_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS portal_read ON %I', t);
    EXECUTE format('CREATE POLICY portal_read ON %I FOR SELECT TO anon, authenticated USING (true)', t);
    EXECUTE format('DROP POLICY IF EXISTS portal_write ON %I', t);
    EXECUTE format('CREATE POLICY portal_write ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('DROP POLICY IF EXISTS portal_service ON %I', t);
    EXECUTE format('CREATE POLICY portal_service ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
