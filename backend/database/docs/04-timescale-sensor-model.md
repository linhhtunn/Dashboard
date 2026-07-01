# TigerData / TimescaleDB Sensor Model

TigerData/TimescaleDB giu raw wearable streams va time-series query. Thiet ke nay follow contract moi trong `backend/simulator/core/docs/wearable_simulator_expected_output.md`, nhung gom bang de ERD gon hon.

## Bang de xuat

Ban gon nhung van ro nghia gom 11 bang:

1. `raw_sensor_events`
2. `wearable_continuous`
3. `wearable_intervals`
4. `wearable_measurements`
5. `motion_batches`
6. `ecg_measurements`
7. `sleep_sessions`
8. `sleep_stage_intervals`
9. `daily_hrv_metrics`
10. `health_features`
11. `latest_sensor_values`

## Contract rules can ton trong

- Simulator output khong co `schema_version`.
- Simulator output khong co `message_type`.
- Simulator output khong co `quality`, `signal_quality`, `source`.
- Queue/file/table name xac dinh loai stream.
- `timestamp` trong payload map sang cot DB `time`.
- Triggered streams co `event_type` va `trigger_type`.
- 60s streams co `interval_seconds`.
- Batch streams co `window_start`, `window_end`.
- Khong co `distance_m` trong output v1.
- Motion raw moi emit `acc_magnitude` / `gyro_magnitude`; Team 2 chi can validate va luu raw batch.

## Time columns

| Column | Meaning |
| --- | --- |
| `time` | thoi diem sensor/stream do duoc; normalized hypertables partition theo cot nay |
| `received_at` | thoi diem backend/RabbitMQ consumer nhan message |
| `ingested_at` | thoi diem raw event duoc ghi vao DB |
| `created_at` | thoi diem normalized/feature row duoc tao |
| `updated_at` | thoi diem cache/latest row duoc update |

`raw_sensor_events` co the partition theo `received_at` vi raw la ingestion log. Cac bang normalized nen partition theo `time`.

## Lineage, not hard FK

Quan he trong Mermaid giua `raw_sensor_events` va cac bang normalized la **data lineage**, khong phai bat buoc foreign key cung.

Ly do:

- Insert time-series nhieu, FK cung co the lam cham consumer.
- Mot raw event co the normalize ra nhieu dong.
- Batch/daily streams khong phai luc nao cung map 1-1.
- Hypertable/partition nen uu tien write throughput.

Trace nguoc bang:

- `message_id`
- `patient_id`
- `device_id`
- `time`

## `raw_sensor_events`

Luu payload goc de debug/reprocess. Bang nay la append-only ingestion log; neu dung hypertable thi nen nghieng ve partition theo `received_at`.

| Field | Type | Note |
| --- | --- | --- |
| `time` | timestamptz | payload `timestamp`, hoac `measured_at` voi daily metrics |
| `received_at` | timestamptz | backend nhan luc nao |
| `message_id` | text | idempotency key, nullable voi JSON daily khong co message |
| `patient_id` | text | patient id tu payload |
| `device_id` | text | device id tu payload, nullable voi sleep/daily files |
| `stream_name` | text | wearable_continuous/wearable_stress/etc |
| `event_type` | text | triggered streams only |
| `trigger_type` | text | triggered streams only |
| `raw_payload` | jsonb | payload goc |
| `ingested_at` | timestamptz | insert time |

Unique de xuat:

- `(received_at, message_id)` neu raw la hypertable partition theo `received_at`.
- `(stream_name, patient_id, time)` cho daily JSON khong co `message_id`.

Neu can enforce `message_id` unique tuyet doi cho raw events, de `raw_sensor_events` la normal table hoac them mot bang idempotency rieng. Hypertable unique index phai gom partition column.

## `wearable_continuous`

1 Hz PPG realtime stream. Hien tai chi gom HR va respiratory rate.

Source stream: `{patient_id}/continuous.jsonl`

| Field | Type | Note |
| --- | --- | --- |
| `time` | timestamptz | payload `timestamp` |
| `received_at` | timestamptz | backend received time |
| `message_id` | text | unique message id |
| `patient_id` | text | patient id |
| `device_id` | text | wearable id |
| `heart_rate` | int | bpm |
| `respiratory_rate` | int | breaths/min |
| `created_at` | timestamptz | insert time |

Khong chua steps, stress, BP, SpO2, battery, ECG, motion.

Unique/idempotency de xuat: `(time, message_id)`.

## `wearable_intervals`

Bang gom cac stream interval/windowed summary vi cung co `time`, `window_start`, `interval_seconds`.

Source streams:

- `{patient_id}/steps_event.jsonl`
- `{patient_id}/stress.jsonl`

| Field | Type | Note |
| --- | --- | --- |
| `time` | timestamptz | window end timestamp |
| `window_start` | timestamptz | derive: `time - interval_seconds` |
| `window_end` | timestamptz | same as `time`, explicit for easier queries |
| `received_at` | timestamptz | backend received time |
| `message_id` | text | unique message id |
| `patient_id` | text | patient id |
| `device_id` | text | wearable id |
| `interval_type` | text | `steps`, `stress` |
| `interval_seconds` | int | default 60 cho steps/stress |
| `steps_count` | int | steps stream only |
| `steps_rate_per_min` | int | steps stream only |
| `activity_type` | text | steps stream only |
| `stress_score` | int | stress stream only |
| `stress_level` | text | stress stream only: rest/low/medium/high |
| `created_at` | timestamptz | insert time |

Rationale: interval streams co cung query pattern theo time window. PPI raw batch tach rieng vao `ppi_patches` vi can giu full beat-to-beat list cho AFib/HRV.

Unique/idempotency de xuat: `(time, message_id)` hoac `(time, patient_id, device_id, interval_type)`.

## `ppi_patches`

Bang luu raw beat-to-beat PPI intervals tu `{patient_id}/ppi_batch.jsonl`.

| Field | Type | Note |
| --- | --- | --- |
| `time` | timestamptz | payload `timestamp` / window end |
| `window_start` | timestamptz | payload `window_start` |
| `window_end` | timestamptz | payload `window_end` |
| `message_id` | text | unique message id |
| `patient_id` | text | patient id |
| `device_id` | text | wearable id |
| `interval_seconds` | int | default 15 |
| `ppi_intervals_ms` | jsonb | raw PPI/RR intervals in ms |
| `beat_count` | int | generated from `ppi_intervals_ms` length |

## `wearable_measurements`

Bang gom cac triggered/scheduled measurement nho. BP duoc giu bang cot rieng vi mot lan do co 2 value.

Source streams:

- `{patient_id}/bp_triggered.jsonl`
- `{patient_id}/spo2_triggered.jsonl`
- `{patient_id}/battery.jsonl`

| Field | Type | Note |
| --- | --- | --- |
| `time` | timestamptz | payload `timestamp` |
| `received_at` | timestamptz | backend received time |
| `message_id` | text | unique message id |
| `patient_id` | text | patient id |
| `device_id` | text | wearable id |
| `measurement_type` | text | `blood_pressure`, `spo2`, `battery` |
| `systolic_bp` | int | BP only, mmHg |
| `diastolic_bp` | int | BP only, mmHg |
| `spo2` | int | SpO2 only, percent |
| `battery_level` | int | battery only, 0-100 percent |
| `created_at` | timestamptz | insert time |

Rationale: 30-minute triggered/device-status streams nho, volume thap. Gop duoc de ERD gon. Sensor stream khong luu label `normal`/`abnormal`; ground truth nam o Supabase `scenario_ground_truth`.

Unique/idempotency de xuat: `(time, message_id)` hoac `(time, patient_id, device_id, measurement_type)`.

## `motion_batches`

ACC/GYRO batch stream. Store raw points in JSONB first; derive point-level table later if Team 3 needs high-frequency SQL over motion.

Source stream: `{patient_id}/motion_batch.jsonl`

| Field | Type | Note |
| --- | --- | --- |
| `time` | timestamptz | payload `timestamp`, usually window end |
| `window_start` | timestamptz | batch start |
| `window_end` | timestamptz | batch end |
| `received_at` | timestamptz | backend received time |
| `message_id` | text | unique message id |
| `patient_id` | text | patient id |
| `device_id` | text | wearable id |
| `motion_sampling_rate_hz` | int | e.g. 5 Hz |
| `motion_points` | jsonb | array of `t_ms`, `acc_magnitude`, `gyro_magnitude` |
| `created_at` | timestamptz | insert time |

Optional later: `motion_points` exploded table with one row per point if fall detection needs SQL window query over every point.

## `activity_timeline_segments`

Activity/sleep timeline segments exported by simulator for offline analysis and chart overlays.

Source file: `activity_timeline.json`.

| Field | Type | Note |
| --- | --- | --- |
| `time` | timestamptz | segment start / event time |
| `patient_id` | text | patient id |
| `device_id` | text | wearable id |
| `kind` | text | `sleep` or `activity` |
| `state` | text | deep/light/rem/awake/sitting/walking/etc |
| `start_time` | timestamptz | segment start |
| `end_time` | timestamptz | segment end |
| `duration_minutes` | double precision | segment duration |

## `ecg_measurements`

Daily/triggered ECG. ECG is not realtime HR source.

Source stream: `{patient_id}/ecg_triggered.jsonl`

| Field | Type | Note |
| --- | --- | --- |
| `measurement_id` | text | PK, can reuse `message_id` |
| `time` | timestamptz | payload `timestamp` |
| `received_at` | timestamptz | backend received time |
| `message_id` | text | unique message id |
| `patient_id` | text | patient id |
| `device_id` | text | wearable id |
| `ecg_result` | text | e.g. normal |
| `ecg_rhythm` | text | e.g. sinus_rhythm |
| `ecg_abnormal_flags` | jsonb | array |
| `ecg_lead` | text | e.g. lead_I |
| `ecg_unit` | text | mV |
| `ecg_sampling_rate_hz` | int | e.g. 250 |
| `ecg_duration_seconds` | int | e.g. 30 |
| `ecg_points` | jsonb | array of `t_ms`, `value`; object storage later if too large |
| `created_at` | timestamptz | insert time |

Bang nay de normal table trong MVP. Ly do: `PRIMARY KEY (measurement_id)` khong gom cot partition `time`; neu bien thanh hypertable thi primary key/unique index phai doi sang composite key co `time`.

## `sleep_sessions`

Daily sleep timeline header.

Source file: `sleep_timeline_{suffix}.json`

| Field | Type | Note |
| --- | --- | --- |
| `sleep_session_id` | text | PK, derive from patient/date |
| `patient_id` | text | patient id |
| `device_id` | text | nullable if file does not emit device id |
| `sleep_date` | date | sleep date |
| `start_time` | timestamptz | sleep start |
| `end_time` | timestamptz | derive from start + duration |
| `sleep_duration_min` | int | total duration |
| `sleep_score` | int | downstream-derived, nullable |
| `sleep_quality` | text | downstream-derived, nullable |
| `detail` | jsonb | original detail array |
| `created_at` | timestamptz | insert time |

Simulator raw sleep timeline khong emit `sleep_quality`. Sleep quality/score la downstream-derived neu can.

## `sleep_stage_intervals`

Derived from `sleep_sessions.detail` for easier timeline chart/query. Giu bang nay vi dashboard sleep timeline se can query tung doan awake/light/deep/rem.

| Field | Type | Note |
| --- | --- | --- |
| `stage_id` | text | PK, derived |
| `sleep_session_id` | text | FK to sleep session |
| `patient_id` | text | patient id |
| `device_id` | text | nullable |
| `start_time` | timestamptz | derived cumulative start |
| `end_time` | timestamptz | derived cumulative end |
| `state` | text | awake/light/deep/rem |
| `duration_min` | int | duration |

Neu MVP muon gon hon nua, co the bo bang nay va chi giu `sleep_sessions.detail` JSONB.

Bang nay de normal table trong MVP. Ly do: `PRIMARY KEY (stage_id)` khong gom cot partition `start_time`; volume sleep stage thap hon sensor realtime va query chinh theo `sleep_session_id`.

## `daily_hrv_metrics`

Daily morning HRV RMSSD.

Source file: `daily_metrics_{suffix}.json`

| Field | Type | Note |
| --- | --- | --- |
| `patient_id` | text | patient id |
| `date` | date | metric date |
| `measured_at` | timestamptz | after sleep end |
| `hrv_rmssd_morning` | int | ms |
| `created_at` | timestamptz | insert time |

## `health_features`

Downstream feature table for Team 3. This is not raw simulator output.

| Field | Type | Note |
| --- | --- | --- |
| `time` | timestamptz | feature timestamp/window end |
| `patient_id` | text | patient id |
| `device_id` | text | device id |
| `feature_window` | text | 1min/5min/10min/etc |
| `source_window_start` | timestamptz | window start |
| `source_window_end` | timestamptz | window end |
| `avg_heart_rate` | double precision | derived |
| `max_heart_rate` | double precision | derived |
| `avg_respiratory_rate` | double precision | derived |
| `min_spo2` | double precision | derived |
| `avg_stress_score` | double precision | derived |
| `ppi_rmssd_ms_avg` | double precision | derived |
| `steps_count` | int | derived/window sum |
| `acc_magnitude_max` | double precision | derived from motion points |
| `gyro_magnitude_max` | double precision | derived from motion points |
| `anomaly_score` | double precision | Team 3 output, optional |
| `features` | jsonb | extra features |
| `created_at` | timestamptz | insert time |

Unique de xuat: `(patient_id, device_id, feature_window, source_window_start, source_window_end)`.

## `latest_sensor_values`

Cache latest value cho dashboard. Upsert from normalized streams.

| Field | Type | Note |
| --- | --- | --- |
| `patient_id` | text | PK part |
| `device_id` | text | source device |
| `metric` | text | heart_rate/spo2/stress_score/etc |
| `value_numeric` | double precision | latest numeric value |
| `value_text` | text | latest categorical value |
| `unit` | text | bpm/%/ms/etc |
| `last_measured_at` | timestamptz | latest sensor time |
| `received_at` | timestamptz | backend received |
| `stream_name` | text | source stream |
| `updated_at` | timestamptz | cache updated |

Primary key de xuat: `(patient_id, device_id, metric)`.

Bang nay la normal table/cache, khong phai hypertable.

## Aggregates / Views

- `samples_agg_5min`: HR/RR avg/min/max/count/last.
- `samples_agg_1hour`: HR/RR hourly history.
- `ppi_agg_5min`: PPI/RMSSD/SDNN derived from `ppi_patches`.
- `interval_agg_5min`: stress/steps grouped by `interval_type`.
- `steps_agg_1hour`: sum steps and avg step rate.
- `latest_blood_pressure`: latest BP from `wearable_measurements`.
- `latest_spo2`: latest SpO2 from `wearable_measurements`.
- `latest_battery`: latest battery from `wearable_measurements`.

## Hypertable vs normal table

| Table | Type | Partition time |
| --- | --- | --- |
| `raw_sensor_events` | hypertable/log | `received_at` preferred |
| `wearable_continuous` | hypertable | `time` |
| `wearable_intervals` | hypertable | `time` or `window_start` |
| `ppi_patches` | hypertable | `time` |
| `wearable_measurements` | hypertable | `time` |
| `motion_batches` | hypertable | `window_start` or `time` |
| `ecg_measurements` | normal table for MVP | n/a |
| `sleep_sessions` | normal table | n/a |
| `sleep_stage_intervals` | normal table for MVP | n/a |
| `daily_hrv_metrics` | normal table | n/a |
| `activity_timeline_segments` | hypertable | `time` |
| `health_features` | hypertable | `time` or `source_window_end` |
| `latest_sensor_values` | normal table/cache | n/a |

## Indexes / constraints de xuat

- Sensor hypertables: start with `(patient_id, time DESC)` and only add more indexes after seeing real query patterns.
- Idempotency: unique `(time, message_id)` for stream rows with `message_id`.
- `latest_sensor_values`: unique `(patient_id, device_id, metric)`.
- `health_features`: unique `(time, patient_id, device_id, feature_window, source_window_start, source_window_end)` if hypertable partitioned by `time`.
- `sleep_stage_intervals`: `(sleep_session_id)`, `(patient_id, start_time)`, check `start_time < end_time`.
- `wearable_intervals`: check `window_start < window_end`.

Do not add too many indexes early. Every extra index makes ingest slower because each insert also has to update that index. For MVP, prefer:

- one idempotency unique constraint per ingest table;
- one main query index for dashboard/time-window reads;
- add `(device_id, time DESC)` or other secondary indexes only when there is a real query that needs it.

## Production ingest notes

For high-volume ingest, do not insert one row per SQL statement. Use batch insert.

Example pattern:

```sql
INSERT INTO wearable_continuous (
  time,
  received_at,
  message_id,
  patient_id,
  device_id,
  heart_rate,
  respiratory_rate,
  created_at
)
VALUES
  (...),
  (...),
  (...),
  (...);
```

RabbitMQ consumer flow:

```text
RabbitMQ message
  -> consumer buffers 100-500 rows
  -> batch insert into TimescaleDB
  -> commit succeeds
  -> ACK RabbitMQ messages
```

Batch insert reduces:

- network round trips;
- transaction overhead;
- SQL parsing overhead;
- connection overhead.

ACK RabbitMQ only after the database insert succeeds. If insert fails, do not ACK; let RabbitMQ retry/redeliver, and rely on idempotency constraints such as `(time, message_id)` plus `ON CONFLICT DO NOTHING` or `ON CONFLICT DO UPDATE`.

Recommended batch size for MVP: 100-500 rows per insert. Tune later based on latency, memory, and DB load.

For larger production loads, prefer a connection pool and prepared/bulk insert support from the database driver. Keep batch boundaries per destination table, for example one batch for `wearable_continuous`, another for `wearable_intervals`, another for `wearable_measurements`.
