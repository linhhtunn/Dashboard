-- Migration 0009: Fix state left by 0008 (partial run).
--
-- 1. Drop extra tables that were created but are not needed
-- 2. Truncate the 4 tables that exist and have MIMIC bulk data
-- 3. Create the 3 tables that migration 0008 never got to
-- 4. Drop patient_lab_results (replaced by the hosp_* tables)

-- ── 1. Drop ICU tables ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.icu_chartevents     CASCADE;
DROP TABLE IF EXISTS public.icu_icustays        CASCADE;
DROP TABLE IF EXISTS public.icu_d_items         CASCADE;
DROP TABLE IF EXISTS public.icu_caregiver       CASCADE;

-- ── 2. Drop extra hosp_ tables ────────────────────────────────────────────
DROP TABLE IF EXISTS public.hosp_microbiologyevents CASCADE;
DROP TABLE IF EXISTS public.hosp_procedures_icd     CASCADE;
DROP TABLE IF EXISTS public.hosp_prescriptions      CASCADE;
DROP TABLE IF EXISTS public.hosp_provider           CASCADE;

-- ── 3. Truncate the 4 tables that exist with MIMIC data ───────────────────
TRUNCATE public.hosp_labevents  CASCADE;
TRUNCATE public.hosp_omr        CASCADE;
TRUNCATE public.hosp_patients   CASCADE;
TRUNCATE public.hosp_d_labitems CASCADE;

-- ── 4. Create the 3 tables that 0008 never got to ─────────────────────────

CREATE TABLE IF NOT EXISTS public.hosp_d_icd_diagnoses (
  icd_code    text,
  icd_version integer,
  long_title  text,
  PRIMARY KEY (icd_code, icd_version)
);

CREATE TABLE IF NOT EXISTS public.hosp_diagnoses_icd (
  subject_id  integer REFERENCES public.hosp_patients(subject_id),
  hadm_id     integer,
  seq_num     integer,
  icd_code    text,
  icd_version integer,
  PRIMARY KEY (subject_id, hadm_id, seq_num)
);

CREATE INDEX IF NOT EXISTS idx_hosp_diagnoses_subject ON public.hosp_diagnoses_icd(subject_id);
CREATE INDEX IF NOT EXISTS idx_hosp_diagnoses_hadm    ON public.hosp_diagnoses_icd(hadm_id);

CREATE TABLE IF NOT EXISTS public.patient_directory (
  hospital_patient_code   text PRIMARY KEY
    REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  subject_id              integer UNIQUE
    REFERENCES public.hosp_patients(subject_id),
  display_name            text,
  display_name_normalized text,
  is_active               boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_directory_subject ON public.patient_directory(subject_id);

-- ── 5. Drop patient_lab_results (replaced by the hosp_* tables) ───────────
DROP TABLE IF EXISTS public.patient_lab_results CASCADE;
