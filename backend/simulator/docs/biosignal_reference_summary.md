# 📡 BIOSIGNAL REFERENCE TABLE — Tổng Hợp

> **Baseline:** Người lớn khỏe mạnh 18–60 tuổi, ngang mực nước biển.
> ⚠️ Giá trị IMU (ACC/GYRO) là ngưỡng kỹ thuật phụ thuộc vị trí gắn cảm biến, **không phải** reference lâm sàng.

---

## 📊 Sheet 1 — Signal Ranges by Activity

### ❤️ VITAL SIGNS — Chỉ số sinh tồn

| Signal | Unit | 😴 Ngủ | 🪑 Ngồi | 🧍 Đứng | 🚶 Đi bộ | 🏋️ VĐ Mạnh | Ghi chú |
|--------|------|---------|---------|---------|----------|------------|---------|
| Heart Rate (HR) | bpm | 40–60 | 55–75 | 60–85 | 80–110 | 120–180 | Tăng tuyến tính theo cường độ. Max HR: nam ~(220−tuổi), nữ ~(206−0.88×tuổi) |
| HRV — RMSSD | ms | 40–100 | 35–75 | 30–70 | 20–55 | 10–35 | Phản ánh hoạt động phó giao cảm. Giảm theo tuổi. Nữ cao hơn nam ~10–15ms. Đo ≥5 phút |
| SpO₂ | % | 95–100 | 95–100 | 95–100 | 94–100 | 93–100 | < 90% trong > 30 giây → cần can thiệp y tế |
| Respiratory Rate | brpm | 10–20 | 12–20 | 12–22 | 16–30 | 30–50 | Watch đo bằng PPG/HRV/RSA → dùng cho trend, không phải clinical reference |
| Systolic BP | mmHg | 88–108 | 100–120 | 100–125 | 110–140 | 140–200 | Ngủ thấp hơn ban ngày 10–20% (nocturnal dip). Exercise max: trung bình 176±23 mmHg |
| Diastolic BP | mmHg | 52–72 | 60–80 | 60–82 | 62–85 | 65–90 | DBP thay đổi ít khi vận động. DBP > 90 mmHg khi nghỉ → tiêu chí tăng HA |

---

### 📐 ACCELEROMETER (ACC) — Ngưỡng kỹ thuật

| Signal | Unit | 😴 Ngủ | 🪑 Ngồi | 🧍 Đứng | 🚶 Đi bộ | 🏋️ VĐ Mạnh | Ghi chú |
|--------|------|---------|---------|---------|----------|------------|---------|
| ACC_X (lateral) | g | −0.1–0.1 | −0.3–0.3 | −0.5–0.5 | −1.5–1.5 | −3.0–3.0 | Heuristic kỹ thuật, phụ thuộc vị trí đặt cảm biến |
| ACC_Y (longitudinal) | g | −0.1–0.1 | −0.3–0.3 | −0.5–0.5 | −2.0–2.0 | −3.5–3.5 | Phản ánh nhịp bước nếu đặt ở cổ tay/thắt lưng |
| ACC_Z (vertical) | g | 0.9–1.1 | 0.85–1.05 | 0.8–1.1 | 0.5–1.5 | 0.3–2.0 | Căn thẳng trọng lực → ≈1g khi đứng/ngồi. Cơ sở vật lý vững nhất |
| ACC Magnitude \|a\| | g | 0.9–1.1 | 0.9–1.15 | 0.9–1.2 | 1.0–2.5 | 1.5–4.0 | Nghỉ ≈ 1g. Bosch BMA400: >2g = active, >3g = vigorous |

---

### 🔄 GYROSCOPE (GYRO) — Ngưỡng kỹ thuật

| Signal | Unit | 😴 Ngủ | 🪑 Ngồi | 🧍 Đứng | 🚶 Đi bộ | 🏋️ VĐ Mạnh | Ghi chú |
|--------|------|---------|---------|---------|----------|------------|---------|
| GYRO_X (roll rate) | rad/s | −0.02–0.02 | −0.05–0.05 | −0.1–0.1 | −2.1–2.1 | −3.5–3.5 | Wrist IMU arm-swing ở 2–4 km/h đạt 57–122°/s (~1.0–2.1 rad/s) |
| GYRO_Y (pitch rate) | rad/s | −0.02–0.02 | −0.05–0.05 | −0.1–0.1 | −2.1–2.1 | −3.5–3.5 | Cập nhật từ ±0.5 lên ±2.1 rad/s (walking) |
| GYRO_Z (yaw rate) | rad/s | −0.01–0.01 | −0.03–0.03 | −0.05–0.05 | −1.0–1.0 | −2.5–2.5 | Yaw nhỏ nhất khi nghỉ. Tibial rotation khi chạy có thể > 2 rad/s |

> **Nguồn chính:** AHA Guidelines 2023 · ESC HRV Standards · WHO/VSH/HOPE Asia BP Classification · FDA Pulse Oximeter Safety · Bosch BMI270/BMA400 · Wrist IMU Study (Sensors 2020) · Chest Accelerometer Study (PLOS ONE 2016)

---

## 👥 Sheet 2 — Subjects and Gender Range

> Nguồn: AHA 2017/2023 · ESC HRV Task Force 1996 · BMC Med 2019 (PMID 31506067) · Kubios HRV Normal Values 2024

### ❤️ VITAL SIGNS — Theo nhóm tuổi & giới tính

#### Heart Rate — Resting (bpm)

| Nhóm | ✅ Bình thường | ⚠️ Bất thường |
|------|--------------|--------------|
| 🧑 Young Male (18–35) | 60–75 | < 50 hoặc > 100 |
| 👩 Young Female (18–35) | 65–80 | < 55 hoặc > 100 |
| 🤰 Pregnant | 70–90 (+10–15 bpm so với pre-preg) | < 60 hoặc > 110 |
| 👴 Elderly Male (≥65) | 65–85 | < 55 hoặc > 95 |
| 👵 Elderly Female (≥65) | 70–90 | < 60 hoặc > 100 |

#### Heart Rate — Normal Activity (bpm)

| Nhóm | ✅ Bình thường | ⚠️ Bất thường |
|------|--------------|--------------|
| 🧑 Young Male | 80–120 | < 65 hoặc > 140 |
| 👩 Young Female | 85–125 | < 70 hoặc > 145 |
| 👴 Elderly Male | 75–110 | < 65 hoặc > 120 |
| 👵 Elderly Female | 80–115 | < 70 hoặc > 125 |

#### Heart Rate — Max Exercise (bpm)

| Nhóm | ✅ Bình thường | ⚠️ Bất thường |
|------|--------------|--------------|
| 🧑 Young Male | 185–200 (≈220−tuổi) | < 130 hoặc > 205 |
| 👩 Young Female | 185–200 | < 130 hoặc > 205 |
| 🤰 Pregnant | 140–155 (≤75–80% HR max) | < 110 hoặc > 160 |
| 👴 Elderly Male | 130–155 (≈220−tuổi) | < 100 hoặc > 165 |
| 👵 Elderly Female | 130–155 | < 100 hoặc > 165 |

#### SpO₂ (%)

| Nhóm | ✅ Bình thường | ⚠️ Bất thường |
|------|--------------|--------------|
| 🧑 Young Male | 96–100 | < 94% (hypoxemia) |
| 👩 Young Female | 96–100 | < 94% |
| 🤰 Pregnant | 95–100 | < 94% (nguy hiểm cho thai) |
| 👴 Elderly Male (≥70) | 94–99 (95% OK) | < 90% (cần can thiệp) |
| 👵 Elderly Female | 94–99 | < 90% (cần can thiệp) |

#### Systolic BP — Ngồi nghỉ (mmHg)

| Nhóm | ✅ Bình thường | ⚠️ Bất thường |
|------|--------------|--------------|
| 🧑 Young Male | 100–119 (mục tiêu AHA < 120) | < 90 hoặc ≥ 130 |
| 👩 Young Female | 95–115 | < 90 hoặc ≥ 130 |
| 🤰 Pregnant | 105–135 (tăng dần cuối thai kỳ) | < 95 hoặc ≥ 140 (nguy cơ preeclampsia) |
| 👴 Elderly Male | 110–139 | < 90 hoặc ≥ 140 |
| 👵 Elderly Female | 105–135 | < 90 hoặc ≥ 140 |

#### Diastolic BP — Ngồi nghỉ (mmHg)

| Nhóm | ✅ Bình thường | ⚠️ Bất thường |
|------|--------------|--------------|
| 🧑 Young Male | 60–79 | < 50 hoặc ≥ 80 |
| 👩 Young Female | 58–76 | < 50 hoặc ≥ 80 |
| 🤰 Pregnant | 60–85 (thấp nhất tuần 20–24) | < 50 hoặc ≥ 90 (preeclampsia) |
| 👴 Elderly Male | 65–89 | < 55 hoặc ≥ 90 |
| 👵 Elderly Female | 62–87 | < 55 hoặc ≥ 90 |

---

### 📐 ACCELEROMETER — Theo nhóm tuổi & giới tính

| Signal | Nhóm | ✅ Bình thường | ⚠️ Bất thường |
|--------|------|--------------|--------------|
| ACC Magnitude \|a\| — đi bộ (g) | 🧑 Young Male | 1.0–2.5 | < 0.5 hoặc > 4.0 |
| | 👩 Young Female | 1.0–2.4 | < 0.5 hoặc > 4.0 |
| | 🤰 Pregnant | 0.8–2.0 (bước chậm, bụng nặng) | < 0.3 hoặc > 3.5 |
| | 👴👵 Elderly | 0.6–1.8 | < 0.3 hoặc > 3.5 (nguy cơ ngã) |
| Step Cadence — đi bộ (steps/min) | 🧑 Young Male | 90–130 | < 60 hoặc > 140 |
| | 👩 Young Female | 95–125 | < 60 hoặc > 145 |
| | 🤰 Pregnant | 70–100 (giảm do mang bầu) | < 50 hoặc > 120 |
| | 👴👵 Elderly | 65–95 | < 50 (nguy cơ ngã cao) |
| ACC_Z — đứng/ngồi (g) | 🧑👩 Young | 0.8–1.2 | < 0.3 hoặc > 3.0 |
| | 🤰 Pregnant | 0.75–1.2 | < 0.3 hoặc > 3.0 |
| | 👴👵 Elderly | 0.75–1.15 | < 0.3 hoặc > 2.8 |

---

### 🔄 GYROSCOPE — Theo nhóm tuổi & giới tính

| Signal | Nhóm | ✅ Bình thường | ⚠️ Bất thường |
|--------|------|--------------|--------------|
| GYRO avg — đi bộ (rad/s) | 🧑👩 Young | 0.1–0.5 | < 0.02 hoặc > 2.0 |
| | 🤰 Pregnant | 0.08–0.4 | < 0.02 hoặc > 1.8 |
| | 👴👵 Elderly | 0.05–0.3 | < 0.02 hoặc > 1.5 |
| **GYRO peak — lúc ngã (rad/s)** | 🧑👩 Young | Không ngã = bình thường | **> 1.5 trong < 300ms → FLAG NGÃ** |
| | 🤰 Pregnant | — | **> 1.2 trong < 300ms** |
| | 👴👵 Elderly | — | **> 1.0 trong < 300ms** |

---

### ⚡ STROKE RISK INDICATORS

| Signal | Nhóm | ✅ Bình thường | ⚠️ Nguy cơ đột quỵ |
|--------|------|--------------|-------------------|
| HR (AFib proxy) | 🧑 Young Male | Đều, 55–100 bpm | Irregular + HRV > 150ms → nghi AFib |
| | 👩 Young Female | Đều, 60–100 | Irregular + HRV > 150ms |
| | 🤰 Pregnant | Đều, 70–100 | Irregular hoặc > 110 (tachyarrhythmia) |
| | 👴👵 Elderly | Đều, 50–90 | Irregular + HRV > 150ms (AFib = stroke risk ++) |
| Systolic BP | 🧑👩 Young | < 120 (optimal), 120–129 (elevated) | ≥ 140 (Hypertension = stroke risk) |
| | 🤰 Pregnant | < 140 | ≥ 140 (preeclampsia → eclampsia/stroke) |
| | 👴 Elderly Male | < 140 | ≥ 160 (high stroke risk) |
| | 👵 Elderly Female | < 140 | ≥ 160 |

> AFib là yếu tố nguy cơ đột quỵ #1. Người > 65 tuổi nguy cơ AFib cao hơn **5×**. SBP < 140 mmHg giảm đột quỵ 35–44% (AHA 2023).

---

## ⚠️ Sheet 3 — Anomaly Cases

### 🔴 CRITICAL Alerts

| Anomaly | Signals | Trigger Condition | Possible Cause | Action |
|---------|---------|-------------------|---------------|--------|
| **Cardiac Arrest / Asystole** | HR, ACC | HR = 0 & ACC < 0.1g > 10s | Tim ngừng đập, bất tỉnh | **ALERT EMERGENCY IMMEDIATELY** |
| **Severe Bradycardia** | HR, HRV | HR < 35 bpm khi thức (ACC > 0.3g) | Block tim, beta-blocker quá liều | Alert + Notify caregiver |
| **Severe Tachycardia** | HR | HR > 150 bpm khi nghỉ (ACC < 0.5g) | Arrhythmia, SVT, AFib, panic | Alert + ECG check |
| **Hypoxemia** | SpO₂ | SpO₂ < 90% > 30 giây | COPD, sleep apnea, PE | Alert + Seek medical attention |
| **Hypertensive Crisis** | BP | SBP > 180 hoặc DBP > 120 mmHg | Hypertensive emergency | Alert + ER immediately |
| **Atrial Fibrillation** | HR, HRV | Irregular > 10 bpm variability, HRV > 150ms | AFib, atrial flutter | Alert + ECG confirmation |
| **Fall Detection** | ACC, GYRO | ACC > 4g trong < 200ms rồi giảm đột ngột | Ngã, tai nạn | Alert emergency contact |

### 🟡 WARNING Alerts

| Anomaly | Signals | Trigger Condition | Possible Cause | Action |
|---------|---------|-------------------|---------------|--------|
| **Hypotension** | SBP | SBP < 90 mmHg khi đứng | Dehydration, orthostatic hypotension | Alert + Sit/lie down |
| **Low HRV Alert** | HRV | RMSSD < 10 ms khi nghỉ | Stress, overtraining, illness | Recommend rest & hydration |
| **Sleep Apnea Pattern** | SpO₂, HR, ACC | SpO₂ drops ≥ 3% + HR spike + ACC ≈ 0 (ngủ) | Obstructive sleep apnea | Flag → sleep study |
| **Resting Tachycardia** | HR | HR 100–149 bpm khi ngồi/nằm | Fever, anxiety, dehydration, thyroid | Check temperature, hydration |
| **Prolonged Inactivity** | ACC | ACC < 0.15g > 4 tiếng ban ngày | Sedentary/possible incapacitation | Movement reminder / check-in |
| **Exercise-Induced Hypoxemia** | SpO₂ | SpO₂ < 93% khi vận động mạnh | Cardiovascular/pulmonary limitation | Slow down, monitor recovery |

### 🔵 INFO Flags

| Anomaly | Signals | Trigger Condition | Possible Cause | Action |
|---------|---------|-------------------|---------------|--------|
| **Sensor Disconnection** | All | HR = 0 & SpO₂ = 0 & ACC = 0 đồng thời | Tháo thiết bị / lỗi kết nối | Discard data, log gap |
| **Motion Artifact** | HR, SpO₂ | HR biến động > 30 bpm trong 5s & ACC > 3g | Chuyển động mạnh làm nhiễu quang học | Flag data as unreliable, apply filter |

---

## 🔑 Legend / Chú giải nhóm đối tượng

| Ký hiệu | Nhóm |
|---------|------|
| ✅ | Giá trị bình thường theo nhóm tuổi/giới tính |
| ⚠️ | Ngưỡng cần alert caregiver / can thiệp y tế |
| 🟡 | Warning (Thai kỳ) — theo dõi sát, hai tính mạng liên quan |
| 🧑 | Young Male — Nam 18–35 tuổi, không bệnh nền |
| 👩 | Young Female — Nữ 18–35 tuổi, không mang thai |
| 🤰 | Pregnant — Phụ nữ mang thai (mọi tam cá nguyệt) |
| 👴 | Elderly Male — Nam ≥ 65 tuổi |
| 👵 | Elderly Female — Nữ ≥ 65 tuổi (sau mãn kinh, nguy cơ CV tăng) |
