# Data Contract giữa Team 1, Team 2, Team 3

## Mục đích

Tài liệu này dùng để thống nhất cách Team 1, Team 2 và Team 3 phối hợp trong hệ thống **E2E Simulation for AI Health**.

Ba team cần thống nhất trước các phần liên quan đến dữ liệu để tránh tình trạng:

- Team 1 bắn data một kiểu.
- Team 2 validate/clean/lưu DB một kiểu.
- Team 3 detect anomaly hoặc validate simulator một kiểu khác.

Nói ngắn gọn, Team 1–2–3 cần thống nhất **data contract**.

---

# 1. Thống nhất use case và scenario

## Mục tiêu

Chốt trước simulator sẽ tạo những tình huống nào và Team 3 sẽ detect/validate những tình huống nào.

Team 3 chốt các bất thường có thể từ các sensor ,data của team 1

| Sensor type | Health parameter |
|---|---|
| Accelerometer | Gia tốc theo 3 trục X-Y-Z, dùng để phát hiện té ngã, đi/chạy/ngồi/nằm, đo mức độ vận động của cơ thể, số bước chân và trạng thái hoạt động như walking, sitting, lying, running. |
| Gyroscope | Vận tốc quay theo 3 trục X-Y-Z, dùng để xác định xoay người, thay đổi tư thế, mất thăng bằng và chuyển động bất thường của cơ thể. |
| SpO2 | Độ bão hòa oxy trong máu, dùng để theo dõi tình trạng hô hấp và phát hiện dấu hiệu thiếu oxy. |
| Blood pressure | Huyết áp tâm thu và tâm trương, dùng để theo dõi huyết áp và đánh giá nguy cơ tăng huyết áp hoặc đột quỵ. |
| Heart rate | Nhịp tim (BPM) và biến thiên nhịp tim (HRV), dùng để phát hiện nhịp tim bất thường hoặc các vấn đề tim mạch. Kết hợp với accelerometer để đo heart rate lúc nghỉ so với lúc hoạt động, heart rate mỗi bước chân. |
| Sleep-derived features | Thời lượng ngủ, chất lượng giấc ngủ và tần suất cử động khi ngủ, dùng để đánh giá tình trạng nghỉ ngơi và sức khỏe tổng quát. |


## Mỗi scenario cần thống nhất

```text
scenario_id
event_type
ground_truth_label
event_start
event_end
expected_severity
expected_pattern
```

Ví dụ:

```json
{
  "scenario_id": "SCN_FALL_001",
  "event_type": "fall",
  "ground_truth_label": "ABNORMAL",
  "event_start": "2026-05-28T10:05:00Z",
  "event_end": "2026-05-28T10:05:05Z",
  "expected_severity": "HIGH",
  "expected_pattern": {
    "acc_spike": true,
    "post_event_low_movement": true,
    "heart_rate_increase": "mild"
  }
}
```

## Ai dùng phần này?

- **Team 1** dùng để tạo data theo kịch bản.
- **Team 2** dùng để giữ metadata/schema khi lưu dữ liệu.
- **Team 3** dùng để evaluate anomaly detection và validate simulator.

---

# 2. Thống nhất raw message schema

## Mục tiêu

Team 1 bắn data theo schema nào thì Team 2 và Team 3 phải đọc đúng schema đó.

## Raw vitals payload đề xuất

```json
{
  "message_id": "msg_000001",
  "schema_version": "v1",
  "patient_id": "P001",
  "device_id": "SIM_WATCH_001",
  "timestamp": "2026-05-28T10:05:02Z",
  "signals": {
    "heart_rate": 112,
    "systolic_bp": 116,
    "diastolic_bp": 76,
    "blood_glucose": 5.3,
    "spo2": 98,
    "acc_x": 3.5,
    "acc_y": 2.9,
    "acc_z": 0.6,
    "gyro_x": 0.12,
    "gyro_y": 0.05,
    "gyro_z": 0.02
  },
  "context": {
    "activity_state": "walking",
    "scenario_id": "SCN_FALL_001",
    "event_phase": "peak",
    "source": "simulator"
  }
}
```

## Cần thống nhất rõ

```text
field nào bắt buộc
field nào optional
đơn vị đo của từng signal
timestamp format
sampling rate
tên field
schema version
```

## Đơn vị đo đề xuất

```text
heart_rate: bpm
blood pressure: mmHg
blood_glucose: mmol/L hoặc mg/dL, cần chọn một chuẩn
spo2: %
accelerometer: g
gyroscope: deg/s hoặc rad/s, cần chọn một chuẩn
timestamp: ISO 8601 UTC
```

---

# 3. Thống nhất ground-truth metadata

## Mục tiêu

Team 3 cần biết nhãn thật để evaluate anomaly detection và validate simulator. Tuy nhiên, label này không nên được dùng trực tiếp làm input cho inference logic.

## Thiết kế đề xuất

Tách thành 2 loại dữ liệu:

```text
1. Vitals stream
   - sensor values
   - scenario_id
   - event_phase

2. Ground-truth metadata
   - scenario_id
   - event_type
   - ground_truth_label
   - event_start
   - event_end
   - expected_pattern
```

## Ground-truth metadata mẫu

```json
{
  "scenario_id": "SCN_FALL_001",
  "patient_id": "P001",
  "event_type": "fall",
  "ground_truth_label": "ABNORMAL",
  "event_start": "2026-05-28T10:05:00Z",
  "event_end": "2026-05-28T10:05:05Z",
  "expected_severity": "HIGH",
  "expected_pattern": {
    "acc_spike": true,
    "post_event_low_movement": true,
    "heart_rate_increase": "mild"
  }
}
```

## Cách truyền ground truth

Có thể chọn một trong các cách sau:

```text
Cách 1: Team 1 gửi ground_truth.json/csv cho Team 3.
Cách 2: Team 1 publish qua broker với routing key scenario.ground_truth.
Cách 3: Team 2 lưu vào bảng scenario_ground_truth trong DB để Team 3 query.
```

## Khuyến nghị MVP

Với MVP, cách sạch và dễ nhất là:

```text
Team 1 bắn vitals.raw qua broker/API.
Team 1 cung cấp ground_truth.json/csv riêng.
Team 2 lưu clean/features và giữ nguyên scenario_id.
Team 3 join clean/features với ground_truth theo scenario_id + patient_id + time window.
```

---

# 4. Thống nhất RabbitMQ / transport contract

## Mục tiêu

Nếu dùng RabbitMQ/CloudAMQP, Team 1–2–3 phải chốt rõ producer, consumer, queue, routing key và message format.

## Thiết kế MVP đề xuất

```text
Exchange:
health.events

Exchange type:
topic

Team 1 publish:
routing_key = vitals.raw

Team 2 consume:
queue = q.team2.raw_vitals
binding_key = vitals.raw
```

## Optional cho Team 3 realtime

Nếu Team 3 cần consume stream realtime trực tiếp:

```text
Team 3 consume:
queue = q.team3.raw_vitals
binding_key = vitals.raw
```

Tuy nhiên, với MVP nên ưu tiên:

```text
Team 1 → RabbitMQ → Team 2 → DB/features → Team 3
```

## Routing keys đề xuất

| Routing key | Publisher | Consumer | Ý nghĩa |
|---|---|---|---|
| `vitals.raw` | Team 1 | Team 2, optional Team 3 | Dữ liệu sensor thô từ simulator |
| `scenario.ground_truth` | Team 1 | Team 3 hoặc Team 2 lưu DB | Metadata ground truth của scenario |
| `features.windowed` | Team 2 | Team 3 | Feature theo window |
| `alerts.created` | Team 3 | Dashboard/Agent/backend | Alert bất thường |
| `data.fault` | Team 2 | Dashboard/backend log | Data lỗi kỹ thuật |
| `sim.quality` | Team 3 | Team 1/internal report | Feedback chất lượng simulator |

## Queue MVP tối thiểu

```text
q.team2.raw_vitals
q.dead_letter
```

Optional:

```text
q.team3.raw_vitals
q.team3.ground_truth
q.alerts.created
```

---

# 5. Thống nhất FAULT và ABNORMAL

## Mục tiêu

Tránh nhầm giữa lỗi kỹ thuật của dữ liệu và bất thường sức khỏe.

## Team 2 xử lý trạng thái kỹ thuật

```text
VALID
INVALID
MISSING_VALUE
DUPLICATE
OUT_OF_RANGE
SENSOR_FAULT
PIPELINE_ERROR
```

## Team 3 xử lý trạng thái sức khỏe/anomaly

```text
NORMAL
WARNING
ABNORMAL
CRITICAL
```

## Ví dụ phân biệt

```text
heart_rate = -20
→ Team 2: SENSOR_FAULT / INVALID
→ Không nên đưa sang Team 3 để detect bệnh.

heart_rate = 145, glucose = 3.0, timestamp hợp lệ
→ Team 2: VALID
→ Team 3: ABNORMAL / WARNING / CRITICAL
```

## Quy tắc chốt

```text
FAULT = dữ liệu/sensor/pipeline có vấn đề.
ABNORMAL = pattern sức khỏe có dấu hiệu bất thường.
```

---

# 6. Thống nhất raw, clean và feature output

## Mục tiêu

Team 2 phải cung cấp output đủ rõ để Team 3 dùng được.

## Ba lớp dữ liệu nên có

```text
raw_vitals
clean_vitals
vital_features
```

## Ý nghĩa

```text
raw_vitals:
- Dữ liệu gốc từ Team 1 Simulator.
- Dùng để audit/debug.

clean_vitals:
- Dữ liệu đã validate, clean, chuẩn hóa timestamp/unit.
- Dùng cho dashboard và một phần anomaly.

vital_features:
- Dữ liệu đã tính feature theo window.
- Dùng chính cho Team 3 anomaly detection.
```

## Feature cơ bản Team 2 nên tính

```text
acc_magnitude
gyro_magnitude
rolling_mean
rolling_std
min/max trong window
slope
delta_from_previous
missing_rate
baseline_deviation
```

## Team 3 cần thống nhất với Team 2

```text
window size: 5s, 30s, 1min?
feature nào cần cho từng scenario?
fall cần acc_max, acc_energy, post_event_movement
hypoglycemia cần glucose_slope, min_glucose, time_below_threshold
BP abnormal cần systolic_slope, diastolic_slope, duration_above/below_threshold
```

---

# 7. Thống nhất simulator validation criteria

## Mục tiêu

Team 3 cần check simulator theo tiêu chí cụ thể, không check mơ hồ kiểu “nhìn có vẻ thật không”.

Simulator validation nên gồm 4 lớp:

```text
1. Label consistency
2. Pattern validity
3. Separability
4. Realism against reference
```

---

## 7.1 Label consistency

Câu hỏi:

```text
Team 1 bảo scenario này là abnormal, vậy trong data có thật sự xuất hiện abnormal pattern không?
```

Ví dụ với fall:

```text
Ground truth: event_type = fall
Team 3 check:
- Có acc spike trong event window không?
- Post-event movement có giảm không?
- HR có phản ứng nhẹ không?
```

Nếu không có acc spike:

```text
Simulator gắn label fall nhưng data không giống fall.
```

---

## 7.2 Pattern validity

Câu hỏi:

```text
Pattern của abnormal scenario có đúng logic không?
```

### Fall scenario

Expected pattern:

```text
pre-event: movement bình thường
event: acceleration magnitude tăng đột ngột
post-event: movement giảm hoặc bất thường
optional: HR tăng nhẹ sau event
```

Features/checks:

```text
acc_magnitude
acc_peak
acc_std
post_event_acc_mean
hr_delta_after_event
```

### Hypoglycemia scenario

Expected pattern:

```text
glucose giảm dần theo thời gian
có warning phase trước critical
không tụt kiểu random nhảy loạn
có recovery hoặc tiếp tục low glucose rõ ràng
```

Features/checks:

```text
glucose_slope
min_glucose
time_below_threshold
glucose_drop_duration
recovery_slope
```

### Blood pressure abnormality scenario

Expected pattern:

```text
BP tăng/giảm theo trend
không nhảy vô lý từng giây
systolic và diastolic có quan hệ tương đối hợp lý
event kéo dài đủ lâu
```

Features/checks:

```text
systolic_slope
diastolic_slope
bp_variability
duration_above_threshold
duration_below_threshold
```

---

## 7.3 Separability

Câu hỏi:

```text
Normal và abnormal có phân biệt được không?
```

Nếu normal và abnormal quá giống nhau:

```text
model/rule sẽ không detect được gì.
```

Nếu abnormal quá lộ:

```text
data có thể quá giả và không giống thực tế.
```

Team 3 có thể check:

```text
normal vs abnormal distribution có khác nhau vừa đủ không
fall có khác walking/running không
hypoglycemia có khác glucose dao động bình thường không
BP abnormal có khác stress/activity bình thường không
```

Metric đơn giản:

```text
mean difference
peak difference
slope difference
overlap giữa normal/abnormal
simple classifier baseline có phân biệt được không
```

---

## 7.4 Realism against reference

Câu hỏi:

```text
Data simulate có gần với public dataset/reference hoặc domain rule không?
```

Nếu có public dataset, Team 3 có thể so sánh:

```text
mean/std/range
peak magnitude
event duration
slope
frequency
correlation
```

Không cần giống 100%, nhưng không được phi lý.

---

## Output simulator quality report mẫu

```json
{
  "scenario_id": "SCN_FALL_001",
  "event_type": "fall",
  "quality_score": 0.82,
  "status": "PASS",
  "checks": {
    "label_consistency": "PASS",
    "pattern_validity": "PASS",
    "separability": "WARNING",
    "realism_reference": "PASS"
  },
  "issues": [
    "fall event is detectable but post-fall low-movement phase is too short"
  ],
  "recommendation": "Increase post-fall low movement duration from 5s to 20-30s."
}
```

---

# 8. Thống nhất alert schema

## Mục tiêu

Team 3 tạo alert thì Team 4/5/backend phải đọc được. Team 1/2 cũng cần hiểu alert để debug luồng data.

## Alert schema đề xuất

```json
{
  "alert_id": "ALT_000001",
  "patient_id": "P001",
  "timestamp": "2026-05-28T10:05:03Z",
  "scenario_id": "SCN_FALL_001",
  "alert_type": "fall_detected",
  "health_status": "ABNORMAL",
  "severity": "HIGH",
  "confidence": 0.91,
  "evidence": {
    "acc_magnitude": 4.8,
    "event_window": "10:05:00-10:05:05"
  },
  "message": "Possible fall detected from acceleration spike."
}
```

## Alert types đề xuất

```text
fall_detected
hypoglycemia_warning
blood_pressure_abnormal
heart_rate_abnormal
low_spo2
```

## Severity đề xuất

```text
LOW
MEDIUM
HIGH
CRITICAL
```

---

# 9. Phân vai theo data contract

## Team 1 — Data Simulator / Message Producer

Team 1 chịu trách nhiệm:

```text
- Tìm dataset/reference.
- Thiết kế patient profile.
- Thiết kế normal/abnormal/fault scenarios.
- Sinh raw vitals.
- Gắn scenario_id và event_phase vào stream.
- Tạo ground-truth metadata cho từng scenario.
- Publish vitals.raw vào RabbitMQ/API/file replay.
- Cung cấp sample payload và sample CSV.
```

## Team 2 — Data Ingestion / Cleaning / Feature Pipeline

Team 2 chịu trách nhiệm:

```text
- Consume vitals.raw.
- Validate raw message schema.
- Check missing/duplicate/out-of-range/timestamp.
- Clean và normalize unit/timestamp.
- Tính generic features.
- Lưu raw_vitals, clean_vitals, vital_features.
- Giữ nguyên scenario_id để Team 3 join với ground truth.
- Có thể lưu scenario_ground_truth vào DB nếu thống nhất.
```

## Team 3 — Anomaly Detection / Simulation Validation

Team 3 chịu trách nhiệm:

```text
- Dùng clean data/features để detect anomaly.
- Không dùng ground_truth_label làm input trực tiếp cho inference.
- Tạo alert và health status.
- Dùng ground truth để evaluate detection.
- Dùng ground truth + clean/features để validate simulator.
- Feedback lại Team 1 nếu scenario chưa realistic hoặc chưa rõ.
```

---

# 10. Checklist cần chốt trong buổi họp Team 1–2–3

```text
[ ] Chốt danh sách scenario MVP.
[ ] Chốt raw vitals message schema.
[ ] Chốt đơn vị đo từng signal.
[ ] Chốt timestamp format và sampling rate.
[ ] Chốt scenario_id/event_phase có nằm trong stream không.
[ ] Chốt ground truth gửi qua file, DB hay broker.
[ ] Chốt RabbitMQ exchange/queue/routing key.
[ ] Chốt Team 2 lưu raw/clean/features như thế nào.
[ ] Chốt feature window size.
[ ] Chốt FAULT vs ABNORMAL.
[ ] Chốt simulator validation criteria.
[ ] Chốt alert schema.
```

---

# 11. Tóm tắt ngắn gọn

Team 1, Team 2 và Team 3 cần thống nhất 8 nhóm chính:

```text
1. Use cases/scenarios
2. Raw message schema
3. Ground-truth metadata format
4. RabbitMQ/transport contract
5. FAULT vs ABNORMAL meaning
6. Raw/clean/feature outputs
7. Simulator validation criteria
8. Alert schema
```

Câu chốt:

> Team 1 tạo dữ liệu và ground truth; Team 2 đảm bảo dữ liệu đúng, sạch, có feature và lưu được; Team 3 dùng dữ liệu sạch + ground truth để phát hiện bất thường, evaluate detection và validate simulator. Ba team cần chốt data contract trước khi code để tránh vỡ integration.
