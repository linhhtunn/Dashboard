# Wearable Simulator - Expected Output Contract

## 1. Overview

Simulator se sinh du lieu wearable theo huong gan thiet bi thuc te.

Output chinh:

```text
wearable_continuous_{suffix}.jsonl
wearable_spo2_triggered_{suffix}.jsonl
wearable_ecg_triggered_{suffix}.jsonl
sleep_timeline_{suffix}.json
sleep_metrics_{suffix}.json
daily_metrics_{suffix}.json
faulty_wearable_continuous_{suffix}.jsonl
faulty_wearable_spo2_triggered_{suffix}.jsonl
faulty_wearable_ecg_triggered_{suffix}.jsonl
wearable_fault_log_{suffix}.json
```

Quy uoc chung:

- Khong dung `schema_version`.
- Khong dung `message_type`.
- Khong dua config nhu `window_seconds` vao output.
- Khong dung `quality`, `signal_quality`, `source`.
- Queue/file/table name se xac dinh loai du lieu.
- Cac chi so phai co tuong quan sinh ly voi nhau.
- Signal noise layer co the tao transient ngan tren HR/RR/stress, nhung khong tao message/timeline rieng.
- Clean output va faulty output duoc tach rieng. Faulty output chi dung de test data quality pipeline.
- Continuous output sinh moi 1 giay.
- HR/RR la sliding-window estimate, nhung output van sinh lien tuc theo tung giay.
- Khong sinh `distance_m` trong output v1. Distance la derived metric tu steps/stride/GPS, neu can co the tinh sau.

Awake activity states:

```text
sitting
standing
walking
vigorous_activity
resting
```

## 2. Continuous Wearable Data

File:

```text
wearable_continuous_P005_24h.jsonl
```

Moi dong la mot JSON record.

Format:

```json
{
  "message_id": "msg_P005_cont_000001",
  "patient_id": "P005",
  "device_id": "SIM_WATCH_P005",
  "timestamp": "2026-06-03T00:00:00Z",
  "steps": 1245,
  "heart_rate": 82,
  "respiratory_rate": 16,
  "stress_score": 34
}
```

Field meaning:

| Field | Type | Unit | Note |
|---|---:|---|---|
| `message_id` | string | - | Unique message id |
| `patient_id` | string | - | Patient identifier |
| `device_id` | string | - | Simulated wearable id |
| `timestamp` | string | ISO UTC | Record timestamp |
| `steps` | int | steps | Cumulative daily steps at timestamp |
| `heart_rate` | int | bpm | Sliding-window estimate |
| `respiratory_rate` | int | breaths/min | Sliding-window estimate |
| `stress_score` | int | 0-99 | Derived stress score |

Internal config, not output:

```python
CONTINUOUS_INTERVAL_SECONDS = 1

WINDOWS = {
    "heart_rate_seconds": 30,
    "respiratory_rate_seconds": 60,
}
```

## 3. SpO2 Triggered Data

File:

```text
wearable_spo2_triggered_P005_24h.jsonl
```

SpO2 chi sinh khi co trigger/scheduled measurement.

Format:

```json
{
  "message_id": "msg_P005_spo2_000001",
  "patient_id": "P005",
  "device_id": "SIM_WATCH_P005",
  "timestamp": "2026-06-03T07:30:00Z",
  "spo2": 98
}
```

## 4. ECG Triggered Data

File:

```text
wearable_ecg_triggered_P005_24h.jsonl
```

ECG chi sinh khi co trigger/scheduled measurement.

Format:

```json
{
  "message_id": "msg_P005_ecg_000001",
  "patient_id": "P005",
  "device_id": "SIM_WATCH_P005",
  "timestamp": "2026-06-03T08:00:00Z",
  "ecg_result": "normal",
  "ecg_rhythm": "sinus_rhythm",
  "ecg_abnormal_flags": [],
  "ecg_lead": "lead_I",
  "ecg_unit": "mV",
  "ecg_sampling_rate_hz": 250,
  "ecg_duration_seconds": 30,
  "ecg_points": [
    { "t_ms": 0, "value": 0.01 },
    { "t_ms": 4, "value": 0.02 },
    { "t_ms": 8, "value": 0.03 }
  ]
}
```

Notes:

- `ecg_points` dung `t_ms` de Team 4 ve chart de hon.
- Khong co `heart_rate_estimate`; neu can HR luc do ECG thi lay continuous record gan timestamp ECG nhat.
- Giai doan dau chi simulate ECG binh thuong.

## 5. Sleep Timeline

File:

```text
sleep_timeline_P005_24h.json
```

Sleep duoc sinh tu cung master timeline voi activity de tranh overlap. Sleep session van nam vao ban dem, nhung `sleep_start`, `sleep_end`, duration tung stage, va micro-awake deu co jitter theo seed de khong bi may moc.

Stage hop le:

```text
awake
light
deep
rem
```

Format:

```json
{
  "patient_id": "P005",
  "date": "2026-06-03",
  "sleep_start": "2026-06-03T22:45:00Z",
  "sleep_end": "2026-06-04T06:40:00Z",
  "stages": [
    {
      "stage": "awake",
      "start_time": "2026-06-03T22:45:00Z",
      "end_time": "2026-06-03T22:55:00Z"
    },
    {
      "stage": "light",
      "start_time": "2026-06-03T22:55:00Z",
      "end_time": "2026-06-04T00:20:00Z"
    },
    {
      "stage": "deep",
      "start_time": "2026-06-04T00:20:00Z",
      "end_time": "2026-06-04T01:10:00Z"
    },
    {
      "stage": "rem",
      "start_time": "2026-06-04T01:10:00Z",
      "end_time": "2026-06-04T01:40:00Z"
    }
  ]
}
```

Khong sinh `good/fair/poor` trong raw sleep timeline.

## 6. Sleep Metrics

File:

```text
sleep_metrics_P005_24h.json
```

Sleep metrics la derived output tinh tu `sleep_timeline`, khong gan random.

Format:

```json
{
  "patient_id": "P005",
  "date": "2026-06-03",
  "sleep_start": "2026-06-03T22:25:00Z",
  "sleep_end": "2026-06-04T06:11:00Z",
  "time_in_bed_minutes": 466,
  "total_sleep_minutes": 439,
  "light_sleep_minutes": 253,
  "deep_sleep_minutes": 83,
  "rem_sleep_minutes": 103,
  "awake_minutes": 27,
  "awake_count": 4,
  "cycle_count": 5,
  "sleep_quality_score": 82
}
```

Notes:

- `sleep_quality_score` la score 0-100 tinh tu duration, deep ratio, REM ratio, cycle count, va awake penalty.
- Khong dung label `good/fair/poor`; neu can label thi team sau co the map tu score.

## 7. Daily Metrics

File:

```text
daily_metrics_P005_24h.json
```

Format:

```json
{
  "patient_id": "P005",
  "date": "2026-06-04",
  "measured_at": "2026-06-04T06:45:00Z",
  "hrv_rmssd_morning": 48
}
```

Notes:

- HRV daily sinh sau sleep end.
- Khong can field `source`.

## 8. Correlation Rules

Simulator khong sinh cac chi so doc lap.

Expected correlations:

- Walking/activity tang -> `steps` tang, `heart_rate` tang, `respiratory_rate` tang.
- `vigorous_activity` tang manh hon `walking` tren `steps`, `heart_rate`, `respiratory_rate`, va `stress_score`.
- `standing` tang nhe hon `walking`; `sitting` gan baseline; `resting` giam nhe.
- Deep sleep -> `heart_rate` giam, `respiratory_rate` giam nhe, `stress_score` giam.
- Stress tang -> `heart_rate` tang nhe, `respiratory_rate` tang nhe.
- Signal noise transient co the lam stress tang ngan han trong cung mot activity, khong tinh la ground truth abnormal.
- HRV morning thap -> stress baseline trong ngay co the cao hon.
- SpO2 binh thuong on dinh, khong random dao dong manh neu khong co abnormal scenario.
- ECG normal phai tuong thich voi continuous HR gan thoi diem do.

## 9. Wearable Fault Injection

Fault injection tao file rieng, khong ghi de clean output.

Files:

```text
faulty_wearable_continuous_P005_24h.jsonl
faulty_wearable_spo2_triggered_P005_24h.jsonl
faulty_wearable_ecg_triggered_P005_24h.jsonl
wearable_fault_log_P005_24h.json
```

Fault types hien co:

```text
missing_record
missing_timestamp
missing_patient_id
missing_field
invalid_heart_rate
invalid_respiratory_rate
invalid_stress_score
invalid_spo2
missing_ecg_points
duplicate_message
out_of_order_timestamp
```

`wearable_fault_log` format:

```json
{
  "stream": "wearable_continuous",
  "fault_type": "invalid_heart_rate",
  "source_message_id": "msg_P005_cont_000085",
  "patient_id": "P005",
  "timestamp": "2026-06-03T00:01:24Z",
  "detail": "Set heart_rate to -20."
}
```

## 10. Config Separation

Non-tech config chi chon user va thoi gian:

```python
PATIENT_ID = "P005"

USER_PROFILE = {
    "age_group": "young",
    "gender": "female",
    "age": 31,
    "pregnancy_status": "pregnant",
    "lifestyle": "moderately_active",
}

HEALTH_MODE = "normal"
ABNORMAL_PROFILE = None

START_TIME = "2026-06-03T00:00:00Z"
DURATION_HOURS = 24
```

Dev/reference config chua:

```python
CONTINUOUS_INTERVAL_SECONDS = 1

WINDOWS = {
    "heart_rate_seconds": 30,
    "respiratory_rate_seconds": 60,
}

TRIGGER_SCHEDULE = {
    "spo2": ["07:30", "21:30"],
    "ecg": ["08:00"],
}

ECG = {
    "duration_seconds": 30,
    "sampling_rate_hz": 250,
    "lead": "lead_I",
}

SLEEP_GENERATION_RULES = {
    "sleep_start": "22:45",
    "sleep_start_jitter_minutes": [-90, 90],
    "sleep_duration_minutes": [300, 600],
    "sleep_onset_awake_minutes": [5, 20],
    "cycle_duration_minutes": [80, 110],
    "micro_awake_probability": 0.25,
    "micro_awake_duration_minutes": [1, 8],
    "cycle_stage_weights": {
        "early": {"light": 0.45, "deep": 0.40, "rem": 0.15},
        "middle": {"light": 0.55, "deep": 0.25, "rem": 0.20},
        "late": {"light": 0.58, "deep": 0.07, "rem": 0.35},
    },
}
```
