# Newcomer Overview

Project dung **hybrid database design**:

- **Supabase/Postgres**: du lieu nghiep vu, dashboard, auth, patient, clinical staff, duty shift, device, alert.
- **TigerData/TimescaleDB**: du lieu sensor theo thoi gian, raw wearable streams, aggregate chart.
- **RabbitMQ**: event bus giua simulator, cleaning service, anomaly service, notification/dashboard worker.

## Y tuong chinh

Supabase tra loi cau hoi:

- Ai la benh nhan?
- Bac si/y ta nao dang truc va co the xem alert?
- Thiet bi nao thuoc benh nhan nao?
- Alert nao dang can xu ly?
- Bac si da review alert ra sao?

TigerData/TimescaleDB tra loi cau hoi:

- Sensor thay doi theo thoi gian nhu the nao?
- Heart rate, SpO2, respiratory rate, stress score dang tang/giam ra sao?
- Du lieu quanh thoi diem alert la gi?
- Dashboard can chart 5 phut, 1 gio, 7 ngay nhu the nao?

## Nguyen tac

- Khong nhet raw sensor stream lien tuc vao Supabase.
- Khong luu full patient/clinical staff profile trong TigerData.
- Luon giu `patient_id`, `device_id`, `message_id` trong time-series de trace nguon do.
- `sensor_id` la metadata noi bo trong `device_sensors`; simulator output hien tai chua emit `sensor_id`.
- Raw payload nen duoc luu rieng de debug/reprocess.

## Simulator streams hien tai

Theo `backend/simulator/core/docs/wearable_simulator_expected_output.md`, simulator tach stream theo tan suat:

- `wearable_continuous`: 1 Hz, chi gom `heart_rate`, `respiratory_rate`; luu vao `wearable_continuous`.
- `wearable_steps_event`: 60s, gom `steps_count`, `steps_rate_per_min`, `activity_type`; luu vao `wearable_intervals`.
- `wearable_stress`: 60s, gom `stress_score`, `stress_level`; luu vao `wearable_intervals`.
- `wearable_ppi_batch`: khoang 15s, gom raw beat-to-beat `ppi_intervals_ms[]`; luu vao `ppi_patches` va raw payload luu trong `raw_sensor_events`.
- `wearable_bp_triggered`: 30 phut, gom `systolic_bp`, `diastolic_bp`; luu vao `wearable_measurements`.
- `wearable_spo2_triggered`: 30 phut, gom `spo2`; luu vao `wearable_measurements`.
- `wearable_battery`: 30 phut, gom `battery_level`; luu vao `wearable_measurements`.
- `wearable_motion_batch`: batch ACC/GYRO voi `motion_points`.
- `wearable_ecg_triggered`: daily ECG.
- `sleep_timeline`: daily sleep stages.
- `daily_metrics`: daily `hrv_rmssd_morning`.
- `activity_timeline`: offline activity/sleep segments; luu vao `activity_timeline_segments`.
- `lab_results`: Supabase `patient_lab_results`.
- `abnormal_episodes`: Supabase `scenario_ground_truth`, source of truth cho label/evaluation.
- `fault_log`: Supabase `wearable_fault_log`, de QA validation/fault handling.

Khong assume cac field cu nhu `schema_version`, `message_type`, `quality`, `signal_quality`, `source`, `distance_m` trong raw simulator v2.

## Nguyen tac gom bang

- Gop 60s summaries vao `wearable_intervals` vi cung la windowed data.
- Gop BP/SpO2/battery vao `wearable_measurements` vi deu la scheduled/triggered low-volume measurements.
- Khong gop motion, ECG, sleep vao bang chung vi payload va query pattern khac han.
