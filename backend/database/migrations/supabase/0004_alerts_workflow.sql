CREATE TABLE IF NOT EXISTS public.alerts (
  alert_id text PRIMARY KEY,
  patient_id text NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  device_id text REFERENCES public.devices(device_id) ON DELETE SET NULL,
  sensor_id text REFERENCES public.device_sensors(sensor_id) ON DELETE SET NULL,
  scenario_id text REFERENCES public.scenario_definitions(scenario_id) ON DELETE SET NULL,
  source_event_id text,
  dedup_key text,
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  alert_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'viewed', 'reviewed', 'resolved', 'dismissed')),
  shift_id text REFERENCES public.staff_shifts(shift_id) ON DELETE SET NULL,
  claimed_by_staff_id text REFERENCES public.clinical_staff(staff_id) ON DELETE SET NULL,
  reason text,
  confidence double precision CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_version text,
  rule_version text,
  source text NOT NULL DEFAULT 'team3_anomaly',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.alert_context (
  alert_id text PRIMARY KEY REFERENCES public.alerts(alert_id) ON DELETE CASCADE,
  patient_id text NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  window_start timestamptz,
  window_end timestamptz,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  chart_query_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (window_end IS NULL OR window_start IS NULL OR window_start < window_end)
);

CREATE TABLE IF NOT EXISTS public.alert_reviews (
  review_id text PRIMARY KEY,
  alert_id text NOT NULL REFERENCES public.alerts(alert_id) ON DELETE CASCADE,
  staff_id text NOT NULL REFERENCES public.clinical_staff(staff_id) ON DELETE CASCADE,
  review_status text NOT NULL CHECK (review_status IN ('confirmed', 'false_alarm', 'uncertain')),
  note text,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alert_id, staff_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  notification_id text PRIMARY KEY,
  alert_id text NOT NULL REFERENCES public.alerts(alert_id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
  recipient_type text NOT NULL CHECK (recipient_type IN ('staff', 'patient', 'admin')),
  recipient_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_audit_logs (
  id bigserial PRIMARY KEY,
  event_id text,
  event_type text,
  alert_id text REFERENCES public.alerts(alert_id) ON DELETE SET NULL,
  patient_id text REFERENCES public.patients(patient_id) ON DELETE SET NULL,
  service_name text,
  status text NOT NULL CHECK (status IN ('processed', 'failed', 'skipped')),
  message text,
  error_detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_alerts_updated_at ON public.alerts;
CREATE TRIGGER trg_alerts_updated_at
BEFORE UPDATE ON public.alerts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
