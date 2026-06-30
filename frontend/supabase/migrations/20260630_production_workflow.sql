-- Production workflow, identity boundaries, delivery ledger, and append-only audit.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS department_code TEXT NOT NULL DEFAULT 'internal_medicine';

UPDATE roles
SET permissions = jsonb_set(permissions, '{clinical_access}', 'false'::jsonb, true)
WHERE code = 'admin';

ALTER TABLE portal_alerts
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS correlation_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS clinical_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  actor_role TEXT NOT NULL,
  correlation_id UUID NOT NULL,
  idempotency_key TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clinical_audit_aggregate_idx
  ON clinical_audit_events (aggregate_type, aggregate_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS clinical_audit_correlation_idx
  ON clinical_audit_events (correlation_id);

CREATE OR REPLACE FUNCTION public.prevent_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'clinical audit events are append-only';
END;
$$;

DROP TRIGGER IF EXISTS clinical_audit_no_update_delete ON clinical_audit_events;
CREATE TRIGGER clinical_audit_no_update_delete
  BEFORE UPDATE OR DELETE ON clinical_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();

CREATE TABLE IF NOT EXISTS idempotency_keys (
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  PRIMARY KEY (actor_user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS alert_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  alert_id TEXT NOT NULL,
  recipient TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('ui', 'hospital_webhook')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  delivered_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  webhook_receipt TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, recipient, channel),
  UNIQUE (alert_id, recipient, channel)
);

CREATE INDEX IF NOT EXISTS alert_deliveries_alert_idx
  ON alert_deliveries (alert_id, created_at DESC);

CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  deduplication_key TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patient_identity_map (
  internal_patient_token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system TEXT NOT NULL,
  source_patient_id TEXT NOT NULL,
  department_code TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_system, source_patient_id)
);

CREATE TABLE IF NOT EXISTS break_glass_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) >= 10),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  CHECK (expires_at <= granted_at + interval '15 minutes')
);

CREATE OR REPLACE FUNCTION public.current_user_has_break_glass()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM break_glass_grants
    WHERE user_id = auth.uid()
      AND revoked_at IS NULL
      AND expires_at > now()
  )
$$;

CREATE TABLE IF NOT EXISTS ai_interaction_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  patient_token UUID,
  model_version TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  rule_version TEXT NOT NULL,
  tool_calls JSONB NOT NULL DEFAULT '[]'::jsonb,
  citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  outcome TEXT NOT NULL CHECK (outcome IN ('answered', 'abstained', 'blocked', 'error')),
  doctor_feedback JSONB,
  correlation_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS ai_audit_no_update_delete ON ai_interaction_audit;
CREATE TRIGGER ai_audit_no_update_delete
  BEFORE UPDATE OR DELETE ON ai_interaction_audit
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();

-- Remove the permissive bootstrap policies before production access is enabled.
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clean_vitals','health_alerts','portal_patients','portal_alerts','portal_vitals',
    'portal_staff','portal_shifts','portal_shift_staff','portal_schedule_slots',
    'portal_operator_sessions','portal_alert_action_logs'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS portal_read ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS portal_write ON %I', t);
  END LOOP;
END $$;

ALTER TABLE clinical_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_identity_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_glass_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interaction_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS patient_clinical_read ON portal_patients;
CREATE POLICY patient_clinical_read ON portal_patients FOR SELECT TO authenticated USING (
  (public.current_user_role_code() IN ('coordinator', 'doctor') AND department_code = (
    SELECT department_code FROM user_profiles WHERE user_id = auth.uid()
  )) OR public.current_user_has_break_glass()
);

DROP POLICY IF EXISTS alert_clinical_read ON portal_alerts;
CREATE POLICY alert_clinical_read ON portal_alerts FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM portal_patients p
    WHERE p.id = patient_id AND (
      (public.current_user_role_code() IN ('coordinator', 'doctor') AND p.department_code = (
        SELECT department_code FROM user_profiles WHERE user_id = auth.uid()
      )) OR public.current_user_has_break_glass()
    )
  )
);

DROP POLICY IF EXISTS alert_coordinator_update ON portal_alerts;
CREATE POLICY alert_coordinator_update ON portal_alerts FOR UPDATE TO authenticated
  USING (public.current_user_role_code() = 'coordinator')
  WITH CHECK (public.current_user_role_code() = 'coordinator');

DROP POLICY IF EXISTS alert_coordinator_insert ON portal_alerts;
CREATE POLICY alert_coordinator_insert ON portal_alerts FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role_code() = 'coordinator');

DROP POLICY IF EXISTS alert_doctor_update ON portal_alerts;
CREATE POLICY alert_doctor_update ON portal_alerts FOR UPDATE TO authenticated USING (
  public.current_user_role_code() = 'doctor'
  AND EXISTS (
    SELECT 1 FROM portal_alert_assignments a
    WHERE a.alert_id = id AND a.doctor_user_id = auth.uid()
  )
) WITH CHECK (
  public.current_user_role_code() = 'doctor'
  AND EXISTS (
    SELECT 1 FROM portal_alert_assignments a
    WHERE a.alert_id = id AND a.doctor_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS portal_vitals_clinical_read ON portal_vitals;
CREATE POLICY portal_vitals_clinical_read ON portal_vitals FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM portal_patients p
    WHERE p.id = patient_id AND (
      (public.current_user_role_code() IN ('coordinator', 'doctor') AND p.department_code = (
        SELECT department_code FROM user_profiles WHERE user_id = auth.uid()
      )) OR public.current_user_has_break_glass()
    )
  )
);

DROP POLICY IF EXISTS clean_vitals_clinical_read ON clean_vitals;
CREATE POLICY clean_vitals_clinical_read ON clean_vitals FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM portal_patients p
    WHERE p.id = patient_id AND (
      (public.current_user_role_code() IN ('coordinator', 'doctor') AND p.department_code = (
        SELECT department_code FROM user_profiles WHERE user_id = auth.uid()
      )) OR public.current_user_has_break_glass()
    )
  )
);

DROP POLICY IF EXISTS health_alerts_clinical_read ON health_alerts;
CREATE POLICY health_alerts_clinical_read ON health_alerts FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM portal_patients p
    WHERE p.id = patient_id AND (
      (public.current_user_role_code() IN ('coordinator', 'doctor') AND p.department_code = (
        SELECT department_code FROM user_profiles WHERE user_id = auth.uid()
      )) OR public.current_user_has_break_glass()
    )
  )
);

DROP POLICY IF EXISTS action_log_clinical_read ON portal_alert_action_logs;
CREATE POLICY action_log_clinical_read ON portal_alert_action_logs FOR SELECT TO authenticated USING (
  public.current_user_role_code() IN ('coordinator', 'doctor')
  OR public.current_user_has_break_glass()
);

DROP POLICY IF EXISTS action_log_clinical_insert ON portal_alert_action_logs;
CREATE POLICY action_log_clinical_insert ON portal_alert_action_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid()::text AND actor_role = public.current_user_role_code());

DROP POLICY IF EXISTS audit_self_read ON clinical_audit_events;
CREATE POLICY audit_self_read ON clinical_audit_events FOR SELECT TO authenticated USING (
  actor_user_id = auth.uid() OR public.current_user_role_code() = 'admin'
);

DROP POLICY IF EXISTS break_glass_self_manage ON break_glass_grants;
CREATE POLICY break_glass_self_manage ON break_glass_grants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.current_user_role_code() = 'admin');
DROP POLICY IF EXISTS break_glass_self_read ON break_glass_grants;
CREATE POLICY break_glass_self_read ON break_glass_grants FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admin loses implicit access to assignments, encounters, and doctor directory PHI.
DROP POLICY IF EXISTS alert_assignments_read ON portal_alert_assignments;
CREATE POLICY alert_assignments_read ON portal_alert_assignments FOR SELECT TO authenticated USING (
  doctor_user_id = auth.uid() OR public.current_user_role_code() = 'coordinator'
  OR public.current_user_has_break_glass()
);
DROP POLICY IF EXISTS encounters_read ON clinical_encounters;
CREATE POLICY encounters_read ON clinical_encounters FOR SELECT TO authenticated USING (
  doctor_user_id = auth.uid() OR public.current_user_role_code() = 'coordinator'
  OR public.current_user_has_break_glass()
);
DROP POLICY IF EXISTS user_profiles_clinical_read_doctors ON user_profiles;
CREATE POLICY user_profiles_clinical_read_doctors ON user_profiles FOR SELECT TO authenticated USING (
  role_code = 'doctor' AND public.current_user_role_code() IN ('coordinator', 'doctor')
);

-- Server-side services own delivery, outbox, idempotency and audit writes.
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clinical_audit_events','idempotency_keys','alert_deliveries','outbox_events',
    'patient_identity_map','break_glass_grants','ai_interaction_audit'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS service_all ON %I', t);
    EXECUTE format('CREATE POLICY service_all ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

REVOKE UPDATE, DELETE ON clinical_audit_events, ai_interaction_audit FROM authenticated;
GRANT SELECT ON clinical_audit_events, ai_interaction_audit TO authenticated;
GRANT INSERT, SELECT ON break_glass_grants TO authenticated;
GRANT ALL ON clinical_audit_events, idempotency_keys, alert_deliveries, outbox_events,
  patient_identity_map, break_glass_grants, ai_interaction_audit TO service_role;
