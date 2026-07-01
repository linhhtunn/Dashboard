-- Migration: align Supabase schema with wearable simulator v2 output format
-- Apply this on existing instances. Fresh deploys use 0001–0005 directly.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. patients: add height_cm (present in simulator patient_info.json output)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS height_cm double precision
  CHECK (height_cm IS NULL OR height_cm BETWEEN 50 AND 250);
