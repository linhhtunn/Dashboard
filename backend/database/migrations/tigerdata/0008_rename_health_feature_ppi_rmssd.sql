-- Align existing databases with the simulator v2 PPI/HRV naming.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'health_features'
      AND column_name = 'ppi_std_ms_avg'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'health_features'
      AND column_name = 'ppi_rmssd_ms_avg'
  ) THEN
    ALTER TABLE health_features
      RENAME COLUMN ppi_std_ms_avg TO ppi_rmssd_ms_avg;
  END IF;
END $$;
