CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_active_clinical_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinical_staff
    WHERE user_id = (SELECT auth.uid())
      AND status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION private.is_active_clinical_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_active_clinical_staff() TO authenticated;

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_ground_truth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_clinical_staff_user_active
  ON public.clinical_staff (user_id, status);

DROP POLICY IF EXISTS "active staff can read patients" ON public.patients;
CREATE POLICY "active staff can read patients"
ON public.patients
FOR SELECT
TO authenticated
USING ((SELECT private.is_active_clinical_staff()));

DROP POLICY IF EXISTS "active staff can read patient labs" ON public.patient_lab_results;
CREATE POLICY "active staff can read patient labs"
ON public.patient_lab_results
FOR SELECT
TO authenticated
USING ((SELECT private.is_active_clinical_staff()));

DROP POLICY IF EXISTS "active staff can read clinical staff" ON public.clinical_staff;
CREATE POLICY "active staff can read clinical staff"
ON public.clinical_staff
FOR SELECT
TO authenticated
USING ((SELECT private.is_active_clinical_staff()));

DROP POLICY IF EXISTS "active staff can read shifts" ON public.staff_shifts;
CREATE POLICY "active staff can read shifts"
ON public.staff_shifts
FOR SELECT
TO authenticated
USING ((SELECT private.is_active_clinical_staff()));

DROP POLICY IF EXISTS "active staff can read devices" ON public.devices;
CREATE POLICY "active staff can read devices"
ON public.devices
FOR SELECT
TO authenticated
USING ((SELECT private.is_active_clinical_staff()));

DROP POLICY IF EXISTS "active staff can read device sensors" ON public.device_sensors;
CREATE POLICY "active staff can read device sensors"
ON public.device_sensors
FOR SELECT
TO authenticated
USING ((SELECT private.is_active_clinical_staff()));

DROP POLICY IF EXISTS "active staff can read scenario definitions" ON public.scenario_definitions;
CREATE POLICY "active staff can read scenario definitions"
ON public.scenario_definitions
FOR SELECT
TO authenticated
USING ((SELECT private.is_active_clinical_staff()));

DROP POLICY IF EXISTS "active staff can read scenario ground truth" ON public.scenario_ground_truth;
CREATE POLICY "active staff can read scenario ground truth"
ON public.scenario_ground_truth
FOR SELECT
TO authenticated
USING ((SELECT private.is_active_clinical_staff()));

DROP POLICY IF EXISTS "active staff can read alerts" ON public.alerts;
CREATE POLICY "active staff can read alerts"
ON public.alerts
FOR SELECT
TO authenticated
USING ((SELECT private.is_active_clinical_staff()));

DROP POLICY IF EXISTS "active staff can update alerts" ON public.alerts;
CREATE POLICY "active staff can update alerts"
ON public.alerts
FOR UPDATE
TO authenticated
USING ((SELECT private.is_active_clinical_staff()))
WITH CHECK ((SELECT private.is_active_clinical_staff()));

DROP POLICY IF EXISTS "active staff can read alert context" ON public.alert_context;
CREATE POLICY "active staff can read alert context"
ON public.alert_context
FOR SELECT
TO authenticated
USING ((SELECT private.is_active_clinical_staff()));

DROP POLICY IF EXISTS "active staff can read alert reviews" ON public.alert_reviews;
CREATE POLICY "active staff can read alert reviews"
ON public.alert_reviews
FOR SELECT
TO authenticated
USING ((SELECT private.is_active_clinical_staff()));

DROP POLICY IF EXISTS "staff can insert own alert reviews" ON public.alert_reviews;
CREATE POLICY "staff can insert own alert reviews"
ON public.alert_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT private.is_active_clinical_staff())
  AND EXISTS (
    SELECT 1
    FROM public.clinical_staff
    WHERE staff_id = alert_reviews.staff_id
      AND user_id = (SELECT auth.uid())
      AND status = 'active'
  )
);

DROP POLICY IF EXISTS "staff can update own alert reviews" ON public.alert_reviews;
CREATE POLICY "staff can update own alert reviews"
ON public.alert_reviews
FOR UPDATE
TO authenticated
USING (
  (SELECT private.is_active_clinical_staff())
  AND EXISTS (
    SELECT 1
    FROM public.clinical_staff
    WHERE staff_id = alert_reviews.staff_id
      AND user_id = (SELECT auth.uid())
      AND status = 'active'
  )
)
WITH CHECK (
  (SELECT private.is_active_clinical_staff())
  AND EXISTS (
    SELECT 1
    FROM public.clinical_staff
    WHERE staff_id = alert_reviews.staff_id
      AND user_id = (SELECT auth.uid())
      AND status = 'active'
  )
);

DROP POLICY IF EXISTS "active staff can read notifications" ON public.notifications;
CREATE POLICY "active staff can read notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING ((SELECT private.is_active_clinical_staff()));

-- event_audit_logs intentionally has RLS enabled with no authenticated policies.
-- It is for backend/service-role diagnostics, not direct browser access.
