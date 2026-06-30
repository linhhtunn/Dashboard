-- Daily clinical encounters and explicit alert-to-doctor assignments.

CREATE TABLE IF NOT EXISTS portal_alert_assignments (
  alert_id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  doctor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_alert_assignments_doctor_idx
  ON portal_alert_assignments (doctor_user_id, assigned_at DESC);

CREATE TABLE IF NOT EXISTS clinical_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT NOT NULL,
  alert_id TEXT,
  doctor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('completed', 'cancelled')) DEFAULT 'completed',
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  symptoms TEXT NOT NULL DEFAULT '',
  clinical_notes TEXT NOT NULL DEFAULT '',
  conclusion TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status <> 'completed' OR completed_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS clinical_encounters_doctor_completed_idx
  ON clinical_encounters (doctor_user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS clinical_encounters_patient_idx
  ON clinical_encounters (patient_id, completed_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS clinical_encounters_completed_alert_idx
  ON clinical_encounters (alert_id)
  WHERE alert_id IS NOT NULL AND status = 'completed';

ALTER TABLE portal_alert_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_encounters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alert_assignments_read ON portal_alert_assignments;
CREATE POLICY alert_assignments_read ON portal_alert_assignments
  FOR SELECT TO authenticated
  USING (
    doctor_user_id = auth.uid()
    OR public.current_user_role_code() IN ('coordinator', 'admin')
  );

DROP POLICY IF EXISTS alert_assignments_coordinator_write ON portal_alert_assignments;
CREATE POLICY alert_assignments_coordinator_write ON portal_alert_assignments
  FOR ALL TO authenticated
  USING (public.current_user_role_code() = 'coordinator')
  WITH CHECK (public.current_user_role_code() = 'coordinator');

DROP POLICY IF EXISTS encounters_read ON clinical_encounters;
CREATE POLICY encounters_read ON clinical_encounters
  FOR SELECT TO authenticated
  USING (
    doctor_user_id = auth.uid()
    OR public.current_user_role_code() IN ('coordinator', 'admin')
  );

DROP POLICY IF EXISTS encounters_doctor_insert ON clinical_encounters;
CREATE POLICY encounters_doctor_insert ON clinical_encounters
  FOR INSERT TO authenticated
  WITH CHECK (
    doctor_user_id = auth.uid()
    AND public.current_user_role_code() = 'doctor'
  );

DROP POLICY IF EXISTS alert_assignments_service ON portal_alert_assignments;
CREATE POLICY alert_assignments_service ON portal_alert_assignments
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS encounters_service ON clinical_encounters;
CREATE POLICY encounters_service ON clinical_encounters
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Coordinators need to see doctor accounts in the assignment picker.
DROP POLICY IF EXISTS user_profiles_clinical_read_doctors ON user_profiles;
CREATE POLICY user_profiles_clinical_read_doctors ON user_profiles
  FOR SELECT TO authenticated
  USING (
    role_code = 'doctor'
    AND public.current_user_role_code() IN ('coordinator', 'doctor', 'admin')
  );

GRANT SELECT, INSERT, UPDATE ON portal_alert_assignments TO authenticated;
GRANT SELECT, INSERT ON clinical_encounters TO authenticated;
GRANT ALL ON portal_alert_assignments, clinical_encounters TO service_role;
