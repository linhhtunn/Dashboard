# Wearable Simulator - Expected Output Contract

## 1. Overview

Simulator se sinh du lieu wearable theo huong gan thiet bi thuc te.

Output chính:

```text
patient_info_{suffix}.json
wearable_continuous_{suffix}.jsonl          (1 Hz: HR, RR)
wearable_steps_event_{suffix}.jsonl         (60s interval: steps summary)
wearable_stress_{suffix}.jsonl              (60s interval: score + level)
wearable_ppi_batch_{suffix}.jsonl           (15s patch: raw PPI intervals)
wearable_motion_batch_{suffix}.jsonl        (motion window: ACC/GYRO)
wearable_bp_triggered_{suffix}.jsonl        (30 phút/lần)
wearable_spo2_triggered_{suffix}.jsonl      (30 phút/lần)
wearable_battery_{suffix}.jsonl             (30 phút/lần: battery level)
wearable_ecg_triggered_{suffix}.jsonl       (daily: ECG)
sleep_timeline_{suffix}.json                (daily: chi tiết stages)
daily_metrics_{suffix}.json                 (daily: HRV Morning RMSSD)
wearable_fault_log_{suffix}.json
```

Quy ước chung:

- Không dùng `schema_version`.
- Không dùng `message_type`.
- Không đưa config như `window_seconds` vào output.
- Không dùng `quality`, `signal_quality`, `source`.
- Queue/file/table name sẽ xác định loại dữ liệu cho continuous/steps/stress/triggered/sleep/daily.
- Triggered records có thêm `event_type` và `trigger_type` để Team 2+3 phân biệt khi các trigger được bind chung vào một queue.
- Các chỉ số phải có tương quan sinh lý với nhau.
- Signal noise layer có thể tạo transient ngắn trên heart_rate/stress, nhưng không tạo message/timeline riêng.
- Nếu bật fault injection, fault được inject vào chính các file `wearable_*`.
- Không tạo file `faulty_wearable_*` riêng.
- `wearable_fault_log` ghi lại fault đã inject để Team 2 đối chiếu khi test data quality pipeline.

**Data stream groups:**

| Group | Frequency | File/stream | Biosignals / metrics | Notes |
|---|---:|---|---|---|
| Continuous PPG | 1 Hz | `wearable_continuous_{suffix}.jsonl` | `heart_rate`, `respiratory_rate` | Realtime wearable stream. Không chứa steps, stress, BP, SpO2, battery. |
| 60s summary | 60s | `wearable_stress_{suffix}.jsonl` | `stress_score`, `stress_level` | Stress gom theo window để tránh noise ngắn hạn. |
| 15s patch | 15s | `wearable_ppi_batch_{suffix}.jsonl` | `ppi_intervals_ms` | Raw beat-to-beat PPI intervals mỗi 15s. Team 2/3 tự derive HRV (RMSSD, SDNN). |
| 60s summary | 60s | `wearable_steps_event_{suffix}.jsonl` | `steps_count`, `steps_rate_per_min`, `activity_type` | Steps summary theo window, không phải 1Hz. |
| 30-minute triggered | 30 phút | `wearable_bp_triggered_{suffix}.jsonl` | `systolic_bp`, `diastolic_bp` | Blood pressure scheduled measurement. |
| 30-minute triggered | 30 phút | `wearable_spo2_triggered_{suffix}.jsonl` | `spo2` | Oxygen saturation scheduled measurement. |
| 30-minute device status | 30 phút | `wearable_battery_{suffix}.jsonl` | `battery_level` | Battery từ power management của device. |
| Motion batch | 10 Hz | `wearable_motion_batch_{suffix}.jsonl` | `motion_points[].acc_magnitude`, `motion_points[].gyro_magnitude` | ACC/GYRO tách riêng khỏi continuous. |
| Daily | 1×/day | `daily_metrics_{suffix}.json` | `hrv_rmssd_morning` | HRV Morning RMSSD sau sleep end. |
| Daily | 1×/day | `wearable_ecg_triggered_{suffix}.jsonl` | `ecg_points`, `ecg_lead`, `ecg_sampling_rate_hz`, `ecg_duration_seconds` | ECG daily/reference, không dùng làm realtime HR. |
| Daily | 1×/day | `sleep_timeline_{suffix}.json` | `sleep_duration_min`, `detail[].state`, `detail[].duration_min` | Sleep stages + duration. |

Shared fields:

| Applies to | Common fields |
|---|---|
| All JSONL wearable streams | `message_id`, `patient_id`, `device_id`, `timestamp` |
| Triggered streams | `event_type`, `trigger_type` |
| Windowed 60s streams | `interval_seconds` |
| Batch streams | `window_start`, `window_end` when the stream carries multiple points in one record |
| Patient-level JSON files | `patient_id`, plus file-specific metadata |

Không sinh `distance_m` trong output v1.

Awake activity states:

```text
sitting
standing
walking
vigorous_activity
resting
```

Generated patient profiles contain a v2 `wearable_baseline` used internally by
timeline and signal generation:

```json
{
  "heart_rate": 81,
  "stress_score": 39,
  "spo2": 98,
  "hrv_rmssd_morning": 46,
  "daily_step_tendency": 1.011,
  "sleep_start_offset_minutes": 15,
  "sleep_duration_tendency_minutes": 536,
  "sleep_fragmentation_tendency": 0.152,
  "deep_sleep_tendency": 0.196,
  "rem_sleep_tendency": 0.217,
  "ppg_noise_level": 0.01,
  "ppg_amplitude": 0.8,
  "ecg_rhythm": "sinus_rhythm"
}
```

**Note:** PPI (PPG Peak-to-Peak Interval) là khoảng cách giữa 2 đỉnh liên tiếp trong tín hiệu PPG từ optical sensor.
`ppi_intervals_ms` là danh sách raw beat-to-beat; HR = 60000 / mean(intervals), HRV (RMSSD, SDNN) do Team 2/3 tự derive. PPG là sensor continuous realtime khác với ECG (triggered).

## 1.1. Patient Info

File:

```text
patient_info_P005_24h.json
```

File nay chi chua thong tin benh nhan va baseline cua cac signal wearable moi.
BP baseline duoc dung cho triggered blood pressure measurements.

Format:

```json
{
  "patient_id": "P005",
  "device_id": "SIM_WATCH_P005",
  "mimic_subject_id": 10010867,
  "name": "Hoang Thu Ha",
  "age": 28,
  "height_cm": 170,
  "weight_kg": 95,
  "gender": "female",
  "age_group": "young",
  "pregnancy_status": "pregnant",
  "lifestyle": "low_activity",
  "activity_level": "low",
  "risk_factors": ["anemia_risk"],
  "medical_history": "Pregnancy monitoring; obese BMI 32.9; gestational anemia",
  "health_status": "WARNING",
  "baseline_signals": {
    "heart_rate": 88,
    "respiratory_rate": 18.0,
    "stress_score": 42,
    "systolic_bp": 120,
    "diastolic_bp": 62,
    "spo2": 98,
    "hrv_rmssd_morning": 42,
    "ecg_rhythm": "sinus_rhythm"
  }
}
```

## 2. Continuous Wearable Data (PPG Realtime)

File:

```text
wearable_continuous_P005_24h.jsonl
```

Mỗi dòng là một JSON record. Dữ liệu **realtime từ PPG signal** (optical sensor), output mỗi giây, trùng thời điểm PPG.
**Chỉ gồm HR, RR và PPI/HRV; không bao gồm steps/stress/PPI batch 60s, BP, SpO2 hoặc battery.**

Format:

```json
{
  "message_id": "msg_P005_cont_000001",
  "patient_id": "P005",
  "device_id": "SIM_WATCH_P005",
  "timestamp": "2026-06-03T00:00:00Z",
  "heart_rate": 82,
  "respiratory_rate": 16
}
```

Field meaning:

| Field | Type | Unit | Note |
|---|---:|---|---|
| `message_id` | string | - | Unique message id |
| `patient_id` | string | - | Patient identifier |
| `device_id` | string | - | Simulated wearable id |
| `timestamp` | string | ISO UTC | **Realtime PPG timestamp** |
| `heart_rate` | int | bpm | HR = 60000 / mean(ppi_intervals_ms) trong sliding window 30s từ PPG |
| `respiratory_rate` | int | breaths/min | Nhịp thở (algorithm riêng, không từ PPG) |

Internal config, not output:

```python
CONTINUOUS_INTERVAL_SECONDS = 1

WINDOWS = {
    "ppi_seconds": 30,
}
```

**Giải thích:**
- **PPG signal:** Continuous optical sensor realtime → detect peaks → tính PPI (khoảng cách peak-to-peak)
- **heart_rate = 60000 / mean(ppi_intervals_ms):** Tính từ mean các intervals trong sliding window 30s
- **respiratory_rate:** Tính riêng (không phải từ PPG/PPI)
- **ppi_intervals_ms:** Chỉ emit trong `wearable_ppi_batch` (15s patch), không emit trong continuous 1Hz. Team 2/3 tự derive HRV (RMSSD, SDNN) từ list raw intervals này.

## 3. Steps 60s Data

File:

```text
wearable_steps_event_P005_24h.jsonl
```

Gửi summary mỗi **60 giây** cho số bước trong window, không phải 1s liên tục.

Format:

```json
{
  "message_id": "msg_P005_steps_000001",
  "patient_id": "P005",
  "device_id": "SIM_WATCH_P005",
  "timestamp": "2026-06-03T08:31:00Z",
  "steps_count": 92,
  "steps_rate_per_min": 120,
  "activity_type": "walking",
  "interval_seconds": 60
}
```

Field meaning:

| Field | Type | Unit | Note |
|---|---:|---|---|
| `message_id` | string | - | Unique message id |
| `patient_id` | string | - | Patient identifier |
| `device_id` | string | - | Simulated wearable id |
| `timestamp` | string | ISO UTC | Window end timestamp |
| `steps_count` | int | steps | Số bước trong window 60s |
| `steps_rate_per_min` | int | steps/min | Tần suất bước |
| `activity_type` | string | - | `walking`, `running`, `vigorous_activity` |
| `interval_seconds` | int | seconds | Default 60 |

Notes:

- 60s summary: gửi theo window để đồng bộ với stress/PPI summary.
- `steps_count` là số bước trong window, không phải cumulative daily steps.
- Cumulative daily steps có thể derive bằng summing tất cả windows trong ngày.

## 4. Stress Score Data

File:

```text
wearable_stress_P005_24h.jsonl
```

Gửi mỗi **60 giây** (không phải 1s). Bao gồm cả stress level categorical.

Format:

```json
{
  "message_id": "msg_P005_stress_000001",
  "patient_id": "P005",
  "device_id": "SIM_WATCH_P005",
  "timestamp": "2026-06-03T08:31:00Z",
  "stress_score": 45,
  "stress_level": "medium",
  "interval_seconds": 60
}
```

Field meaning:

| Field | Type | Unit | Note |
|---|---:|---|---|
| `message_id` | string | - | Unique message id |
| `patient_id` | string | - | Patient identifier |
| `device_id` | string | - | Simulated wearable id |
| `timestamp` | string | ISO UTC | Window end timestamp |
| `stress_score` | int | 0-100 | Numeric score |
| `stress_level` | string | - | `rest`, `low`, `medium`, `high` |
| `interval_seconds` | int | seconds | Default 60 |

Notes:

- Tần suất 60s (không 1s) để tránh noise ngắn hạn
- `stress_level` categorical: rest (0-20), low (21-40), medium (41-70), high (71-100)
- Tính từ HR variability + activity + respiratory pattern

## 5. PPI 15s Patch Data

File:

```text
wearable_ppi_batch_P005_24h.jsonl
```

Gửi **raw beat-to-beat PPI intervals** mỗi **15 giây** (1 patch). Team 2/3 nhận danh sách intervals thô và tự tính HRV metrics (RMSSD, SDNN, pNN50, v.v.) theo nhu cầu.

Format:

```json
{
  "message_id": "msg_P005_ppi_000001",
  "patient_id": "P005",
  "device_id": "SIM_WATCH_P005",
  "timestamp": "2026-06-03T08:00:14Z",
  "window_start": "2026-06-03T08:00:00Z",
  "window_end": "2026-06-03T08:00:14Z",
  "interval_seconds": 15,
  "ppi_intervals_ms": [735, 728, 742, 718, 731, 745, 722, 738, 719, 741, 728, 735, 722, 740, 730, 738, 725, 741, 728, 733]
}
```

Field meaning:

| Field | Type | Unit | Note |
|---|---:|---|---|
| `message_id` | string | - | Unique message id |
| `patient_id` | string | - | Patient identifier |
| `device_id` | string | - | Simulated wearable id |
| `timestamp` | string | ISO UTC | Window end timestamp |
| `window_start` | string | ISO UTC | Patch start time |
| `window_end` | string | ISO UTC | Patch end time |
| `interval_seconds` | int | seconds | Luôn là 15 |
| `ppi_intervals_ms` | list[int] | ms | Raw beat-to-beat PPI intervals trong 15s |

Notes:

- Số intervals trong patch ≈ HR × 15 / 60 (ví dụ HR = 80 bpm → ~20 intervals/patch).
- HR derive được bằng `60000 / mean(ppi_intervals_ms)`.
- RMSSD, SDNN, pNN50 derive được hoàn toàn từ `ppi_intervals_ms` — simulator không pre-compute.
- Patch tần suất 15s (~4 msg/phút/bệnh nhân), nhẹ hơn 1Hz nhưng đủ dày để HRV rolling window.

## 6. Motion Batch Data

File:

```text
wearable_motion_batch_P005_24h.jsonl
```

ACC/GYRO tach rieng khoi continuous summary vi motion sensor thuc te co the gui tan
suat cao hon 1Hz. Batch nay giup Team 2/3 xu ly feature motion va Team 4 neu can ve
duong motion ma khong lam message continuous qua nang.

Format:

```json
{
  "message_id": "msg_P005_motion_000001",
  "patient_id": "P005",
  "device_id": "SIM_WATCH_P005",
  "timestamp": "2026-06-03T10:00:01Z",
  "window_start": "2026-06-03T10:00:00Z",
  "window_end": "2026-06-03T10:00:01Z",
  "motion_sampling_rate_hz": 10,
  "motion_points": [
    { "t_ms": 0, "acc_magnitude": 0.99, "gyro_magnitude": 0.02 },
    { "t_ms": 100, "acc_magnitude": 1.01, "gyro_magnitude": 0.03 }
  ]
}
```

Field meaning:

| Field | Type | Unit | Note |
|---|---:|---|---|
| `message_id` | string | - | Unique message id |
| `patient_id` | string | - | Patient identifier |
| `device_id` | string | - | Simulated wearable id |
| `timestamp` | string | ISO UTC | Window end timestamp |
| `window_start` | string | ISO UTC | Batch start time |
| `window_end` | string | ISO UTC | Batch end time |
| `motion_sampling_rate_hz` | int | Hz | Default 10Hz, configurable later |
| `motion_points[].t_ms` | int | ms | Offset from `window_start` |
| `motion_points[].acc_magnitude` | float | g | Accelerometer magnitude = √(x²+y²+z²) |
| `motion_points[].gyro_magnitude` | float | rad/s | Gyroscope magnitude = √(x²+y²+z²) |

Notes:

- Chỉ emit `acc_magnitude` và `gyro_magnitude` — không emit từng axis x/y/z.
- `motion_sampling_rate_hz` để trong dev config, không hard-code trong logic.
- Activity ảnh hưởng motion: resting/sleep gần như ổn định, walking có chu kỳ bước, vigorous_activity biên độ lớn hơn.

## 7. Blood Pressure Triggered Data

File:

```text
wearable_bp_triggered_P005_24h.jsonl
```

Blood pressure sinh theo trigger/scheduled measurement mỗi **30 phút**.

Format:

```json
{
  "message_id": "msg_P005_bp_000001",
  "event_type": "wearable.bp_triggered",
  "trigger_type": "blood_pressure",
  "patient_id": "P005",
  "device_id": "SIM_WATCH_P005",
  "timestamp": "2026-06-03T07:00:00Z",
  "systolic_bp": 118,
  "diastolic_bp": 76
}
```

## 8. SpO2 Triggered Data

File:

```text
wearable_spo2_triggered_P005_24h.jsonl
```

SpO2 chi sinh khi co trigger/scheduled measurement.

Format:

```json
{
  "message_id": "msg_P005_spo2_000001",
  "event_type": "wearable.spo2_triggered",
  "trigger_type": "spo2",
  "patient_id": "P005",
  "device_id": "SIM_WATCH_P005",
  "timestamp": "2026-06-03T07:30:00Z",
  "spo2": 98
}
```

## 9. Battery Level Data

File:

```text
wearable_battery_P005_24h.jsonl
```

Battery level sinh từ power management của device mỗi **30 phút**, không nằm trong continuous 1Hz.

Format:

```json
{
  "message_id": "msg_P005_battery_000001",
  "patient_id": "P005",
  "device_id": "SIM_WATCH_P005",
  "timestamp": "2026-06-03T07:00:00Z",
  "battery_level": 87
}
```

Field meaning:

| Field | Type | Unit | Note |
|---|---:|---|---|
| `message_id` | string | - | Unique message id |
| `patient_id` | string | - | Patient identifier |
| `device_id` | string | - | Simulated wearable id |
| `timestamp` | string | ISO UTC | Measurement timestamp |
| `battery_level` | int | % | Pin device (0-100) |

## 10. Daily ECG Data

File:

```text
wearable_ecg_triggered_P005_24h.jsonl
```

ECG là daily measurement (ví dụ 08:00 UTC). **Lưu ý:** ECG là daily/triggered (không realtime),
nên không dùng để tính HR liên tục; dùng continuous PPG realtime thay thế.

Format:

```json
{
  "message_id": "msg_P005_ecg_000001",
  "event_type": "wearable.ecg_triggered",
  "trigger_type": "ecg",
  "patient_id": "P005",
  "device_id": "SIM_WATCH_P005",
  "timestamp": "2026-06-03T08:00:00Z",
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

- `ecg_points` dùng `t_ms` để Team 4 vẽ chart dễ hơn.
- Không có `heart_rate_estimate`; nếu cần HR lúc do ECG thì lấy continuous record gần timestamp ECG nhất.
- Giai đoạn đầu chỉ simulate ECG bình thường.
- ECG thuộc nhóm daily; **PPG continuous** mới là primary cho HR/HRV realtime.

## 11. Daily Sleep Timeline

File:

```text
sleep_timeline_P005_24h.json
```

Sleep Timeline là daily output, sinh từ master timeline; output chi tiết stages + duration (không emit timestamps cứng).

Format:

```json
{
  "patient_id": "P005",
  "date": "2026-06-03",
  "start_time": "2026-06-03T22:45:00Z",
  "sleep_duration_min": 475,
  "detail": [
    { "duration_min": 10, "state": "awake" },
    { "duration_min": 85, "state": "light" },
    { "duration_min": 50, "state": "deep" },
    { "duration_min": 30, "state": "light" },
    { "duration_min": 30, "state": "rem" },
    { "duration_min": 7, "state": "awake" },
    { "duration_min": 263, "state": "light" }
  ]
}
```

Field meaning:

| Field | Type | Unit | Note |
|---|---:|---|---|
| `patient_id` | string | - | Patient identifier |
| `date` | string | ISO date | Ngày ngủ |
| `start_time` | string | ISO UTC | Thời điểm bắt đầu ngủ |
| `sleep_duration_min` | int | min | Tổng thời gian ngủ |
| `detail[].duration_min` | int | min | Thời lượng giai đoạn |
| `detail[].state` | string | - | `awake`, `light`, `deep`, `rem` |

Notes:

- Không sinh `good/fair/poor` trong raw sleep timeline.
- Có jitter theo seed để không bị máy mốc.
- Sleep metrics, quality score, total sleep count — là downstream Team 2 outputs, không emit từ simulator.

## 12. Daily HRV Morning RMSSD

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

- **HRV RMSSD morning** sinh sau sleep end, tính từ `ppi_intervals_ms` trong morning window (5-10 phút sau thức dậy).
- Không cần field `source`.
- RMSSD = Root Mean Square of Successive Differences từ PPG peak-to-peak intervals.

## 13. Correlation Rules

Simulator không sinh các chỉ số độc lập. Tất cả được tính toán với sự tương quan sinh lý từ PPG realtime.

Expected correlations:

- **Activity ↑** (walking/vigorous): `steps` ↑, `heart_rate` ↑, HRV (SDNN/RMSSD từ `ppi_intervals_ms`) ↓ (nhịp cứng hơn), `stress_score` ↑
- **Heart rate ↑**: intervals trong `ppi_intervals_ms` ngắn lại, variance thấp hơn
- **vigorous_activity** ↑ hơn `walking` trên: `steps`, `heart_rate`, `respiratory_rate`, `stress_score`
- **standing** ↑ nhẹ hơn `walking`; `sitting` ≈ baseline; `resting` ↓ nhẹ
- **Deep sleep** → `heart_rate` ↓, HRV từ `ppi_intervals_ms` thấp (nhịp rất đều), `respiratory_rate` ↓
- **REM sleep** → `heart_rate` variable, HRV từ `ppi_intervals_ms` cao (giấc mơ tạo variability), `respiratory_rate` variable
- **Stress ↑** → `heart_rate` ↑, HRV từ `ppi_intervals_ms` ↓ (tight/controlled)
- **PPG noise transient** có thể gây 1-2 intervals bất thường trong patch, không tính là ground truth abnormal.
- **HRV morning thấp** → stress baseline trong ngày có thể cao hơn
- **respiratory_rate** giữ lại độc lập (không từ PPG); có tương quan nhẹ với activity
- **SpO2** bình thường ổn định, không random dao động mạnh nếu không có abnormal scenario
- **BP** là triggered 30 phút/lần, không emit continuous 1 Hz
- **Battery_level** sinh 30 phút/lần từ power management, không emit continuous 1 Hz
- **ACC/GYRO** là motion batch data 10Hz; chỉ emit `acc_magnitude` và `gyro_magnitude`
- **Daily ECG** normal phải tương thích với continuous HR gần thời điểm đó (lấy từ continuous record)
- **Daily HRV Morning RMSSD** sinh sau sleep end từ PPI/HRV morning window
- **Daily Sleep Timeline** mô tả stages + duration cho phiên ngủ trong ngày
- **Awake activity effects** được combine từ base activity + `age_group` modifier + `lifestyle` modifier
- Ví dụ cùng là `walking`, elderly/low_activity sẽ có HR response cao hơn, HRV thấp hơn, step rate thấp hơn young/very_active

## 14. Wearable Fault Injection

Fault injection ghi vào chính các file wearable output. Không tạo file faulty riêng.

Files affected:

```text
wearable_continuous_P005_24h.jsonl
wearable_steps_event_P005_24h.jsonl
wearable_stress_P005_24h.jsonl
wearable_ppi_batch_P005_24h.jsonl
wearable_motion_batch_P005_24h.jsonl
wearable_bp_triggered_P005_24h.jsonl
wearable_spo2_triggered_P005_24h.jsonl
wearable_battery_P005_24h.jsonl
wearable_ecg_triggered_P005_24h.jsonl
wearable_fault_log_P005_24h.json
```

Fault types hiện có:

```text
missing_record
missing_timestamp
missing_patient_id
missing_field
invalid_heart_rate
invalid_ppi_intervals
invalid_respiratory_rate
invalid_stress_score
invalid_battery_level
invalid_motion_value
invalid_blood_pressure
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

## 15. Config Separation

**Non-tech config** chỉ chọn user và thời gian:

```python
PATIENT_ID = "P005"

USER_PROFILE = {
    "age_group": "young",  # young | middle_aged | elderly
    "gender": "female",
    "pregnancy_status": "pregnant",
    "lifestyle": "moderately_active",
}

HEALTH_MODE = "normal"
ABNORMAL_PROFILE = None

START_TIME = "2026-06-03T00:00:00Z"
DURATION_HOURS = 24
```

**Dev/reference config** chứa:

```python
CONTINUOUS_INTERVAL_SECONDS = 1

WINDOWS = {
    "ppi_seconds": 30,        # Sliding window để tính heart_rate realtime từ PPG
    "ppi_patch_seconds": 15,  # Raw PPI patch interval → ppi_intervals_ms
}

MOTION_BATCH = {
    "window_seconds": 1,
    "sampling_rate_hz": 10,
}

TRIGGER_SCHEDULE = {
    "blood_pressure": "every_30_minutes",
    "spo2": "every_30_minutes",
    "battery": "every_30_minutes",
    "ecg": ["08:00"],  # daily
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

**Giải thích:**
- **PPG realtime:** Optical detector detect peaks → tính PPI → sliding window 30s → output mỗi giây
- **heart_rate = 60000 / mean(ppi_intervals)** (từ PPG window 30s)
- **ppi_intervals_ms:** Raw beat-to-beat list; HRV (RMSSD, SDNN) derive phía Team 2/3
- **respiratory_rate:** Tính riêng (không từ PPG)
- **Continuous (1 Hz):** HR, RR — realtime PPG
- **15s patch:** Raw PPI intervals (`ppi_intervals_ms`)
- **60s interval:** Stress score/level, steps summary
- **BP & SpO2 (30 phút/lần):** Scheduled measurement, không realtime
- **Battery_level (30 phút/lần):** % pin device từ power management
- **Daily:** HRV Morning RMSSD, ECG, Sleep Timeline

---

## 16. Lab Results (Static Patient Output)

File:

```text
lab_results_{suffix}.json
```

Sinh **một lần duy nhất** khi khởi tạo simulation, lấy trực tiếp từ field `lab_results` trong `patient_profiles.json`. Không phải time-series — đây là kết quả xét nghiệm máu nền của bệnh nhân (nguồn: MIMIC-IV demo dataset).

Format:

```json
{
  "patient_id": "P001",
  "mimic_subject_id": 10009035,
  "sampled_at": "2026-06-09",
  "chemistry": {
    "glucose_mg_dl": 124,
    "creatinine_mg_dl": 0.9,
    "sodium_meq_l": 138,
    "potassium_meq_l": 4.1,
    "chloride_meq_l": 102,
    "bicarbonate_meq_l": 29,
    "urea_nitrogen_mg_dl": 14,
    "calcium_mg_dl": 8.7,
    "alt_iu_l": 16,
    "ast_iu_l": 18,
    "bilirubin_total_mg_dl": 0.5
  },
  "hematology": {
    "hemoglobin_g_dl": 11.4,
    "hematocrit_pct": 32.8,
    "white_blood_cells_k_ul": 11.9,
    "platelet_count_k_ul": 186,
    "inr": 1.3,
    "ptt_sec": 28.4
  }
}
```

Field meaning:

| Group | Field | Unit | Normal range |
|---|---|---|---|
| chemistry | `glucose_mg_dl` | mg/dL | 70–100 (fasting) |
| chemistry | `creatinine_mg_dl` | mg/dL | M: 0.5–1.2 / F: 0.4–1.1 |
| chemistry | `sodium_meq_l` | mEq/L | 133–145 |
| chemistry | `potassium_meq_l` | mEq/L | 3.3–5.1 |
| chemistry | `chloride_meq_l` | mEq/L | 96–108 |
| chemistry | `bicarbonate_meq_l` | mEq/L | 22–32 |
| chemistry | `urea_nitrogen_mg_dl` | mg/dL | 6–20 |
| chemistry | `calcium_mg_dl` | mg/dL | 8.4–10.3 |
| chemistry | `alt_iu_l` | IU/L | 0–40 |
| chemistry | `ast_iu_l` | IU/L | 0–40 |
| chemistry | `bilirubin_total_mg_dl` | mg/dL | 0–1.5 |
| hematology | `hemoglobin_g_dl` | g/dL | M: 14–18 / F: 12–16 |
| hematology | `hematocrit_pct` | % | M: 40–52 / F: 36–48 |
| hematology | `white_blood_cells_k_ul` | K/uL | 4–11 |
| hematology | `platelet_count_k_ul` | K/uL | 150–440 |
| hematology | `inr` | — | 0.9–1.1 (normal); 2–3 (therapeutic anticoag) |
| hematology | `ptt_sec` | seconds | 25–36.5 |

Notes:

- `null` = không có dữ liệu từ MIMIC cho bệnh nhân này.
- Lab results là **background context** cho Team 3 (Rule Engine) khi xây dựng logic cảnh báo dựa trên bệnh nền.
- Không sinh lại theo thời gian trong v1. Team 2 có thể dùng giá trị này để tham chiếu khi phân loại mức độ nguy hiểm của alert.

---

## 17. Abnormal Cascade Rules

Khi bệnh nhân có `risk_factors` nhất định, simulator inject các episode bất thường có tương quan sinh lý chéo — không phải random noise riêng lẻ.

### 17.1 heart_disease_risk (P001 — mitral valve, P007 — cardiomyopathy)

**Cardiac episode** — xác suất trigger ~4–8% mỗi window 5 phút khi đang awake:

| Signal | Thay đổi | Ghi chú |
|---|---|---|
| `heart_rate` | +30 → +60 bpm (max 170) | Spike đột ngột, hồi phục trong 5–20 phút |
| `ppi_intervals_ms` | intervals ngắn lại, variance ↓ (-30 đến -50%) | Nhịp nhanh → ít biến thiên, HRV giảm |
| `respiratory_rate` | +5 → +10 breaths/min | Phản xạ thở nhanh theo nhịp tim |
| `stress_score` | +20 → +30 | Tăng cùng HR |
| `spo2` (triggered) | -3 → -8% | Cardiac output giảm → SpO2 giảm |
| `systolic_bp` (triggered) | +20 → +40 mmHg | Huyết áp tăng vọt theo episode |

### 17.2 arrhythmia_risk / AFib (P006 — atrial fibrillation)

**Baseline đã là bất thường** — `ecg_rhythm = atrial_fibrillation`, `ppi_resting_std_ms = 45` (rất cao).

**Paroxysmal episode** — xác suất ~5% mỗi giờ:

| Signal | Thay đổi | Ghi chú |
|---|---|---|
| `heart_rate` | +30 → +70 bpm (rapid ventricular response) | Không đều, không có pattern |
| `ppi_intervals_ms` | variance ↑ rất cao (+20 → +40 ms spread) | AFib → biến thiên beat-to-beat rất cao |
| `spo2` (triggered) | -2 → -5% | AFib làm giảm cardiac output |
| `stress_score` | +15 → +25 | — |

### 17.3 diabetes_risk (P002, P008, P010)

**Hyperglycemic episode** (nhẹ hơn, khó phát hiện qua wearable):

| Signal | Thay đổi | Ghi chú |
|---|---|---|
| `heart_rate` | +8 → +15 bpm | Tăng nhẹ |
| `stress_score` | +10 → +20 | — |

**P010 (DKA — uncontrolled)**: baseline HR đã cao (92 bpm), RR cao (19), SpO2 thấp (94%). Episode DKA:

| Signal | Thay đổi |
|---|---|
| `heart_rate` | +20 → +40 bpm |
| `respiratory_rate` | +6 → +12 breaths/min (Kussmaul breathing) |
| `spo2` (triggered) | -3 → -6% |
| `stress_score` | +25 → +40 |

### 17.4 hypertension_risk (P006, P009, P010)

**Hypertensive spike** — xác suất ~3% mỗi giờ:

| Signal | Thay đổi |
|---|---|
| `systolic_bp` (triggered) | +30 → +60 mmHg (vượt 180 mmHg) |
| `heart_rate` | +10 → +20 bpm |
| `stress_score` | +15 → +25 |

### 17.5 anemia_risk (P003, P004, P005, P009)

**Tachycardia compensatory** — liên tục, không phải episode riêng biệt:

- HR baseline đã cao hơn bình thường (tăng 8–15 bpm so với người cùng nhóm tuổi/giới).
- Khi hoạt động thể chất (walking, vigorous): HR spike mạnh hơn, hồi phục chậm hơn.
- Variance của `ppi_intervals_ms` giảm nhẹ (nhịp nhanh liên tục → ít biến thiên).

### 17.6 low_spo2_risk (P008, P010)

- SpO2 baseline thấp (94–95%).
- Khi ngủ sâu (deep sleep): SpO2 có thể dip thêm -2 → -4%.
- Khi có cardiac/stress episode đồng thời: SpO2 có thể xuống dưới 90%.
