# Team Responsibilities

## Team Simulator

Ghi/publish:

- `raw_sensor_events`
- `wearable_continuous`
- `wearable_intervals`
- `wearable_measurements`
- `motion_batches`
- `ecg_measurements`
- `sleep_sessions`
- `sleep_stage_intervals`
- `daily_hrv_metrics`
- `scenario_definitions`
- `scenario_ground_truth`

Can thong nhat:

- `message_id`
- `scenario_id`
- `patient_id`
- `device_id`
- format timestamp UTC
- stream name / routing key de biet loai payload

## Team Cleaning / Ingestion

Ghi:

- raw event vao TigerData
- normalized measurement vao TigerData
- latest sensor value cache
- audit/error log neu consumer fail

Can dam bao:

- idempotency bang `message_id`
- validate unit va value range
- khong lam mat raw payload
- khong expect `schema_version`, `quality`, `signal_quality`, `source` trong simulator output v2
- motion batch da co `acc_magnitude`, `gyro_magnitude`; derive sleep quality/daily totals o downstream neu can

## Team AI / Anomaly Detection

Doc:

- `wearable_continuous`
- `wearable_intervals`
- `wearable_measurements`
- `motion_batches`
- `health_features`
- aggregate/view quanh alert window

Ghi:

- `alerts`
- `alert_context`
- `event_audit_logs`

Can dam bao:

- co `model_version` hoac `rule_version`
- co `source_event_id` / `dedup_key`
- khong tao duplicate alert cho cung mot episode

## Team Frontend / Dashboard

Doc Supabase:

- `patients`
- `devices`
- `device_sensors`
- `alerts`
- `alert_context`
- `alert_reviews`

Doc TigerData qua backend API:

- latest values
- chart 5 min / 1 hour
- raw data quanh alert
