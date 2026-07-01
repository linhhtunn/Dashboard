-- Sensor measurement streams must not store simulator labels.
-- Ground truth lives in Supabase scenario_ground_truth / abnormal episodes.
DROP INDEX IF EXISTS idx_wearable_measurements_status;

ALTER TABLE wearable_measurements
  DROP COLUMN IF EXISTS status;
