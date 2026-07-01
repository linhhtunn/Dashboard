SELECT create_hypertable('raw_sensor_events', 'received_at', if_not_exists => TRUE);
SELECT create_hypertable('wearable_continuous', 'time', if_not_exists => TRUE);
SELECT create_hypertable('wearable_intervals', 'time', if_not_exists => TRUE);
SELECT create_hypertable('wearable_measurements', 'time', if_not_exists => TRUE);
SELECT create_hypertable('motion_batches', 'window_start', if_not_exists => TRUE);
SELECT create_hypertable('health_features', 'time', if_not_exists => TRUE);
SELECT create_hypertable('ppi_patches', 'time', if_not_exists => TRUE);
SELECT create_hypertable('activity_timeline_segments', 'time', if_not_exists => TRUE);

-- Keep these as normal tables (PRIMARY KEY does not include the partition column):
-- - ecg_measurements       → PRIMARY KEY (measurement_id)
-- - sleep_stage_intervals  → PRIMARY KEY (stage_id)
-- TimescaleDB unique indexes/PKs on hypertables must include the partition column.
-- Note: abnormal_episodes_log and wearable_fault_log live in Supabase, not TigerDB.
