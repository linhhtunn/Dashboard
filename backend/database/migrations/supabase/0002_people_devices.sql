CREATE TABLE IF NOT EXISTS public.patients (
  patient_id text PRIMARY KEY,
  mimic_subject_id bigint UNIQUE,
  name text NOT NULL,
  age integer CHECK (age IS NULL OR age BETWEEN 0 AND 130),
  height_cm double precision CHECK (height_cm IS NULL OR height_cm BETWEEN 50 AND 250),
  weight_kg double precision CHECK (weight_kg IS NULL OR weight_kg > 0),
  gender text CHECK (gender IS NULL OR gender IN ('male', 'female', 'other', 'unknown')),
  age_group text CHECK (age_group IS NULL OR age_group IN ('child', 'young', 'adult', 'middle_aged', 'elderly')),
  pregnancy_status text CHECK (pregnancy_status IS NULL OR pregnancy_status IN ('none', 'pregnant', 'postpartum', 'unknown')),
  lifestyle text,
  risk_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  activity_level text CHECK (activity_level IS NULL OR activity_level IN ('low', 'medium', 'high')),
  medical_history text,
  health_status text CHECK (health_status IS NULL OR health_status IN ('NORMAL', 'WARNING', 'CRITICAL', 'UNKNOWN')),
  baseline_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.patient_lab_results (
  lab_result_id text PRIMARY KEY,
  patient_id text NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  sampled_at date NOT NULL,
  panel_type text NOT NULL CHECK (panel_type IN ('chemistry', 'hematology', 'coagulation', 'other')),
  test_name text NOT NULL,
  value_numeric double precision,
  value_text text,
  unit text,
  reference_range text,
  abnormal_flag text CHECK (abnormal_flag IS NULL OR abnormal_flag IN ('low', 'high', 'critical_low', 'critical_high', 'normal')),
  source text NOT NULL DEFAULT 'simulator',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (value_numeric IS NOT NULL OR value_text IS NOT NULL),
  UNIQUE (patient_id, sampled_at, panel_type, test_name)
);

CREATE TABLE IF NOT EXISTS public.clinical_staff (
  staff_id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text,
  department text,
  role text NOT NULL DEFAULT 'doctor' CHECK (role IN ('doctor', 'nurse', 'admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_shifts (
  shift_id text PRIMARY KEY,
  staff_id text NOT NULL REFERENCES public.clinical_staff(staff_id) ON DELETE CASCADE,
  department text,
  shift_role text NOT NULL DEFAULT 'primary' CHECK (shift_role IN ('primary', 'backup', 'on_call')),
  shift_start timestamptz NOT NULL,
  shift_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (shift_start < shift_end)
);

CREATE TABLE IF NOT EXISTS public.devices (
  device_id text PRIMARY KEY,
  patient_id text NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  device_type text NOT NULL DEFAULT 'simulator',
  vendor text,
  model text,
  external_device_key text UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.device_sensors (
  sensor_id text PRIMARY KEY,
  device_id text NOT NULL REFERENCES public.devices(device_id) ON DELETE CASCADE,
  sensor_type text NOT NULL,
  label text,
  unit text,
  stream_name text NOT NULL,
  sampling_mode text NOT NULL CHECK (sampling_mode IN ('continuous', 'windowed', 'triggered', 'batch', 'daily')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_id, stream_name, sensor_type)
);

DROP TRIGGER IF EXISTS trg_patients_updated_at ON public.patients;
CREATE TRIGGER trg_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_devices_updated_at ON public.devices;
CREATE TRIGGER trg_devices_updated_at
BEFORE UPDATE ON public.devices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
