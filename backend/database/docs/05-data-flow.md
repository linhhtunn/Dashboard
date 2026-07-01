# Data Flow

## Main realtime flow

1. Simulator/device publish stream-specific events vao RabbitMQ: `wearable_continuous`, `wearable_steps_event`, `wearable_stress`, `wearable_ppi_batch`, triggered streams, daily streams.
2. Ingestion consumer nhan message.
3. Consumer validate schema, timestamp, unit, value range.
4. Consumer ghi raw payload vao `raw_sensor_events`.
5. Consumer normalize data vao cac bang gon: `wearable_continuous`, `wearable_intervals`, `wearable_measurements`, `motion_batches`, `ecg_measurements`, `sleep_sessions`, `sleep_stage_intervals`, `daily_hrv_metrics`.
6. Consumer update `latest_sensor_values`.
7. Feature service tinh `health_features`.
8. Anomaly service doc feature/raw/aggregate va tao `alerts` neu abnormal.
9. Alert handler tao `alert_context`, audit log, notification event.
10. Dashboard doc app data tu Supabase va chart data tu TigerData qua backend API.

## Why split Supabase and TigerData?

Supabase:

- auth/RLS/dashboard workflow
- patient/clinical staff/shift/device/alert/review
- transaction va relational query

TigerData:

- append-heavy sensor stream
- time-window query
- continuous aggregate
- raw + normalized stream-specific measurements
