# Simulator Stream Contract Summary

File goc: `backend/simulator/core/docs/wearable_simulator_expected_output.md`.

Day la ban tom tat cho database/backend. Neu co mau thuan, uu tien file goc cua simulator.

## Shared rules

- JSONL wearable streams co: `message_id`, `patient_id`, `device_id`, `timestamp`.
- Triggered streams co them: `event_type`, `trigger_type`.
- 60s streams co them: `interval_seconds`.
- Batch streams co: `window_start`, `window_end`.
- Patient-level JSON files co `patient_id` va metadata rieng.

Khong expect cac field nay trong simulator v2:

- `schema_version`
- `message_type`
- `quality`
- `signal_quality`
- `source`
- `distance_m`

## Streams

| Stream | Frequency | DB table proposal | Metrics |
| --- | ---: | --- | --- |
| `wearable_continuous` | 1 Hz | `wearable_continuous` | `heart_rate`, `respiratory_rate` |
| `wearable_steps_event` | 60s | `wearable_intervals` | `steps_count`, `steps_rate_per_min`, `activity_type` |
| `wearable_stress` | 60s | `wearable_intervals` | `stress_score`, `stress_level` |
| `wearable_ppi_batch` | ~15s | `ppi_patches` + `raw_sensor_events` | `ppi_intervals_ms[]` |
| `wearable_bp_triggered` | 30 min | `wearable_measurements` | `systolic_bp`, `diastolic_bp` |
| `wearable_spo2_triggered` | 30 min | `wearable_measurements` | `spo2` |
| `wearable_battery` | 30 min | `wearable_measurements` | `battery_level` |
| `wearable_motion_batch` | batch | `motion_batches` | `motion_points[].acc_magnitude`, `motion_points[].gyro_magnitude` |
| `wearable_ecg_triggered` | daily | `ecg_measurements` | `ecg_points`, `ecg_lead`, `ecg_sampling_rate_hz`, `ecg_duration_seconds` |
| `sleep_timeline` | daily | `sleep_sessions`, `sleep_stage_intervals` | `sleep_duration_min`, `detail[].state`, `detail[].duration_min` |
| `daily_metrics` | daily | `daily_hrv_metrics` | `hrv_rmssd_morning` |
| `activity_timeline` | offline | `activity_timeline_segments` | sleep/activity segments |
| `lab_results` | offline | Supabase `patient_lab_results` | panel/test/value/unit/flag |
| `abnormal_episodes` | offline ground truth | Supabase `scenario_ground_truth` | episode labels and expected effects |
| `fault_log` | offline QA | Supabase `wearable_fault_log` | injected invalid payload details |

## Activity / sleep values

Awake activity states:

- `sitting`
- `standing`
- `walking`
- `vigorous_activity`
- `resting`

Sleep states:

- `awake`
- `light`
- `deep`
- `rem`

Stress levels:

- `rest`
- `low`
- `medium`
- `high`

## Important interpretation

- Continuous stream is PPG realtime, not ECG.
- `heart_rate` is derived from PPI window.
- PPI/HRV detail is emitted only in `wearable_ppi_batch` as `ppi_intervals_ms`.
- BP and SpO2 are scheduled/triggered measurements, not 1 Hz.
- BP/SpO2 sensor payloads must not include `status: normal|abnormal`; labels live in `abnormal_episodes`.
- ECG is daily/triggered and should not be used as the realtime HR source.
- Sleep quality can be derived downstream; motion magnitudes are raw simulator output.
