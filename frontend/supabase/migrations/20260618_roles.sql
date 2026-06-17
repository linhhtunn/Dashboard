-- Clinical RBAC: role definitions live in Supabase (general app data).
-- Time-series vitals remain in TimescaleDB.

CREATE TABLE IF NOT EXISTS roles (
  code TEXT PRIMARY KEY CHECK (code IN ('admin', 'coordinator', 'doctor')),
  label_vi TEXT NOT NULL,
  label_en TEXT NOT NULL,
  description_vi TEXT,
  description_en TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE roles IS 'Clinical role catalog and capability flags for the portal.';

INSERT INTO roles (code, label_vi, label_en, description_vi, description_en, permissions, sort_order)
VALUES
  (
    'coordinator',
    'Điều dưỡng điều phối',
    'Shift coordinator',
    'Nhập xử trí cảnh báo, điều phối ca trực',
    'Record alert treatment and coordinate shift workflow',
    '{
      "clinical_access": true,
      "record_treatment": true,
      "confirm_alerts": false,
      "simulation": false,
      "manage_users": false
    }'::jsonb,
    10
  ),
  (
    'doctor',
    'Bác sĩ trực',
    'On-call physician',
    'Duyệt xác nhận xử trí cảnh báo',
    'Confirm clinical alert resolution',
    '{
      "clinical_access": true,
      "record_treatment": false,
      "confirm_alerts": true,
      "simulation": false,
      "manage_users": false
    }'::jsonb,
    20
  ),
  (
    'admin',
    'Quản trị viên',
    'Administrator',
    'Quản lý người dùng và mô phỏng vitals',
    'Manage users and run vitals simulation',
    '{
      "clinical_access": true,
      "record_treatment": false,
      "confirm_alerts": false,
      "simulation": true,
      "manage_users": true
    }'::jsonb,
    30
  )
ON CONFLICT (code) DO UPDATE SET
  label_vi = EXCLUDED.label_vi,
  label_en = EXCLUDED.label_en,
  description_vi = EXCLUDED.description_vi,
  description_en = EXCLUDED.description_en,
  permissions = EXCLUDED.permissions,
  sort_order = EXCLUDED.sort_order;

-- Maps Supabase Auth users to a single clinical role.
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role_code TEXT NOT NULL REFERENCES roles (code) DEFAULT 'coordinator',
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_profiles_role_code_idx ON user_profiles (role_code);
CREATE INDEX IF NOT EXISTS user_profiles_email_idx ON user_profiles (email);

COMMENT ON TABLE user_profiles IS 'Portal user profile with FK to roles.code.';

CREATE OR REPLACE FUNCTION public.set_user_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_profiles_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role TEXT;
BEGIN
  requested_role := COALESCE(NEW.raw_user_meta_data ->> 'clinical_role', 'coordinator');
  IF requested_role NOT IN ('admin', 'coordinator', 'doctor') THEN
    requested_role := 'coordinator';
  END IF;

  INSERT INTO public.user_profiles (user_id, role_code, display_name, email)
  VALUES (
    NEW.id,
    requested_role,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''),
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    NEW.email
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(user_profiles.display_name, EXCLUDED.display_name);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user_profile();

CREATE OR REPLACE FUNCTION public.current_user_role_code()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role_code FROM public.user_profiles WHERE user_id = auth.uid()
$$;

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roles_read ON roles;
CREATE POLICY roles_read ON roles
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS roles_service ON roles;
CREATE POLICY roles_service ON roles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS user_profiles_read ON user_profiles;
CREATE POLICY user_profiles_read ON user_profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.current_user_role_code() = 'admin'
  );

DROP POLICY IF EXISTS user_profiles_update_self ON user_profiles;
CREATE POLICY user_profiles_update_self ON user_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_profiles_admin_write ON user_profiles;
CREATE POLICY user_profiles_admin_write ON user_profiles
  FOR ALL TO authenticated
  USING (public.current_user_role_code() = 'admin')
  WITH CHECK (public.current_user_role_code() = 'admin');

DROP POLICY IF EXISTS user_profiles_service ON user_profiles;
CREATE POLICY user_profiles_service ON user_profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON roles TO anon, authenticated;
GRANT SELECT, UPDATE ON user_profiles TO authenticated;
GRANT ALL ON roles, user_profiles TO service_role;

-- Backfill profiles for users created before this migration.
INSERT INTO public.user_profiles (user_id, role_code, display_name, email)
SELECT
  u.id,
  CASE
    WHEN u.raw_user_meta_data ->> 'clinical_role' IN ('admin', 'coordinator', 'doctor')
      THEN u.raw_user_meta_data ->> 'clinical_role'
    ELSE 'coordinator'
  END,
  COALESCE(
    NULLIF(u.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(u.raw_user_meta_data ->> 'display_name', ''),
    split_part(COALESCE(u.email, ''), '@', 1)
  ),
  u.email
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;
