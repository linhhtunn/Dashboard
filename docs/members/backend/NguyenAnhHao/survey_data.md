# Wearable Sensor cho Fall Detection và Stroke Warning

## 1. Tổng quan

Thiết bị đeo không thay thế chẩn đoán y tế, nhưng có thể hỗ trợ phát hiện sớm các bất thường như **ngã đột ngột (fall)**, **mất thăng bằng**, **rối loạn nhịp tim**, **tăng huyết áp**, hoặc các thay đổi vận động nghi ngờ liên quan đến **đột quỵ (stroke)**.

Hệ thống nên kết hợp nhiều nguồn tín hiệu: **motion sensor**, **heart sensor**, **blood pressure**, **SpO₂**, và dữ liệu nền của từng người dùng.

---

## 2. Fall Detection

Fall detection là bài toán phát hiện người dùng bị ngã, thường dựa trên gia tốc, góc xoay, thay đổi tư thế và trạng thái sau khi ngã.

### Sensor hữu ích cho Fall Detection

| Sensor | Chỉ số kỹ thuật | Ý nghĩa |
|---|---|---|
| Accelerometer 3-axis | Ax, Ay, Az | Đo gia tốc theo 3 trục |
| Acceleration magnitude | `sqrt(Ax² + Ay² + Az²)` | Phát hiện va chạm mạnh khi ngã |
| Gyroscope | angular velocity x/y/z | Phát hiện xoay người, mất thăng bằng |
| Barometer | altitude change | Phát hiện thay đổi độ cao đột ngột |
| Heart rate sensor | HR | Kiểm tra phản ứng sinh lý sau ngã |
| GPS / indoor location | location | Xác định vị trí người bị ngã |

### Feature nên trích xuất

| Feature | Mô tả |
|---|---|
| Acceleration peak | Đỉnh gia tốc khi va chạm |
| Jerk | Tốc độ thay đổi gia tốc |
| Posture angle | Góc tư thế trước/sau ngã |
| Impact duration | Thời gian va chạm |
| Inactivity after fall | Bất động sau khi ngã |
| Step count drop | Số bước giảm đột ngột |
| Orientation change | Thay đổi hướng cơ thể |

### Logic cảnh báo đơn giản

| Điều kiện | Ý nghĩa |
|---|---|
| Gia tốc tăng đột ngột | Có thể có va chạm |
| Góc tư thế thay đổi nhanh | Có thể mất thăng bằng/ngã |
| Sau va chạm người dùng bất động | Nguy cơ ngã thật cao hơn |
| Không phản hồi xác nhận an toàn | Cần gửi cảnh báo |

---

## 3. Stroke Warning

Stroke warning không phải chẩn đoán đột quỵ. Wearable chủ yếu hỗ trợ phát hiện **yếu tố nguy cơ** và **bất thường sinh lý/vận động** có thể liên quan đến đột quỵ.

Các dấu hiệu lâm sàng quan trọng cần nhớ: **méo mặt, yếu một bên tay/chân, nói khó, nhìn mờ, mất thăng bằng đột ngột**.

### Sensor hữu ích cho Stroke Warning

| Sensor | Chỉ số kỹ thuật | Ý nghĩa |
|---|---|---|
| Blood pressure | SBP, DBP, MAP | Huyết áp cao là nguy cơ lớn của stroke |
| PPG heart rate | HR, resting HR | Theo dõi nhịp tim |
| ECG / PPG rhythm | RR interval, AFib flag | Phát hiện nhịp tim bất thường/rung nhĩ |
| HRV | RMSSD, SDNN | Phản ánh rối loạn thần kinh tự chủ |
| SpO₂ | oxygen saturation | Theo dõi giảm oxy máu |
| Accelerometer | activity, gait, imbalance | Phát hiện mất thăng bằng, giảm vận động |
| Gyroscope | angular velocity | Phát hiện thay đổi tư thế bất thường |

### Feature nên trích xuất

| Nhóm feature | Feature cụ thể |
|---|---|
| Huyết áp | SBP, DBP, MAP, BP variability |
| Tim mạch | HR, RR interval, irregular rhythm, AFib probability |
| HRV | RMSSD, SDNN, pNN50 |
| Oxy máu | SpO₂ current, SpO₂ min, desaturation event |
| Vận động | gait instability, activity drop, fall event |
| Thời gian | change from 5-min, 1-hour, 7-day baseline |

### Logic cảnh báo đơn giản

| Điều kiện | Ý nghĩa |
|---|---|
| Huyết áp cao bất thường | Tăng nguy cơ biến cố mạch máu não |
| Có dấu hiệu AFib/rối loạn nhịp | Tăng nguy cơ stroke do tim mạch |
| Mất thăng bằng/ngã đột ngột | Có thể là biểu hiện thần kinh cấp |
| Giảm vận động một cách bất thường | Có thể liên quan yếu nửa người hoặc mệt bất thường |
| Kèm triệu chứng BE FAST | Cần cảnh báo cấp cứu ngay |

---

## 4. So sánh Fall Detection và Stroke Warning

| Tiêu chí | Fall Detection | Stroke Warning |
|---|---|---|
| Mục tiêu | Phát hiện ngã | Phát hiện nguy cơ/bất thường liên quan stroke |
| Sensor chính | Accelerometer, gyroscope | Blood pressure, ECG/PPG, accelerometer |
| Tín hiệu quan trọng | Va chạm + thay đổi tư thế + bất động | Huyết áp, AFib, mất thăng bằng, giảm vận động |
| Output | Fall / Non-fall | Risk score / warning level |
| Độ chắc chắn | Có thể phát hiện sự kiện ngã khá trực tiếp | Không thể chẩn đoán stroke chắc chắn |
| Hành động | Gửi cảnh báo nếu ngã thật | Gửi cảnh báo nếu nguy cơ cao hoặc có triệu chứng |

---

## 5. Gợi ý dữ liệu đầu vào cho hệ thống AI Health

| Nhóm dữ liệu | Trường dữ liệu |
|---|---|
| User profile | age_group, gender, medical_history |
| Baseline | baseline_HR, baseline_BP, baseline_activity |
| Motion realtime | Ax, Ay, Az, gyro_x, gyro_y, gyro_z |
| Vital realtime | HR, SBP, DBP, SpO₂ |
| Derived feature | jerk, posture_angle, HRV, gait_score |
| Event flag | fall_detected, AFib_flag, high_BP_flag |
| Output | fall_alert, stroke_risk_score, emergency_warning |

---

## 6. Định nghĩa Chi tiết & Mở rộng các Giá trị Metric theo Trạng thái Sức khỏe

Dưới đây là bảng đặc tả chi tiết các ngưỡng giá trị của các chỉ số sinh trắc học và vận động tương ứng với từng trạng thái sức khỏe của người dùng đeo thiết bị. Các thông số này là cơ sở để lập trình cho **Team 1 (Simulator)** phát sinh dữ liệu và **Team 3 (Anomaly Detection)** huấn luyện mô hình/xây dựng bộ quy tắc phát hiện bất thường.

### 6.1. Trạng thái bình thường & Hoạt động thường nhật (Normal Baseline)

#### A. Nghỉ ngơi bình thường (Normal Resting)
Trạng thái người dùng đang ngồi, nằm đọc sách, xem TV hoặc ngủ nhẹ không có biến cố sinh lý.
*   **HR (Nhịp tim):** `60 – 90 bpm` (Nhịp xoang đều đặn khi nghỉ ngơi).
*   **SpO₂ (Độ bão hòa oxy máu):** `96% – 99%` (Mức oxy máu tối ưu của người khỏe mạnh).
*   **SBP (Huyết áp tâm thu):** `110 – 140 mmHg` (Mức huyết áp tối ưu đến bình thường).
*   **DBP (Huyết áp tâm trương):** `70 – 90 mmHg`.
*   **acc_rms (Cường độ gia tốc tổng hợp):** Rất thấp (`< 0.15g`).
*   **posture (Tư thế cơ thể):** `sitting` (ngồi) hoặc `lying` (nằm).
*   **HRV (Biến thiên nhịp tim):** Cao (`30 – 100 ms`), thể hiện hệ thần kinh tự chủ khỏe mạnh, ít stress.

#### B. Đi bộ / Vận động nhẹ (Walking)
Trạng thái di chuyển chủ động, nhịp nhàng.
*   **HR (Nhịp tim):** `resting_HR + (10 – 30) bpm` (Tăng sinh lý nhẹ do cơ bắp tiêu thụ năng lượng).
*   **SpO₂:** `95% – 99%` (Duy trì ổn định nhờ thông khí tốt).
*   **SBP / DBP:** SBP tăng nhẹ (`120 – 150 mmHg`), DBP ổn định hoặc giảm nhẹ (`65 – 85 mmHg`).
*   **acc_rms:** `1.0g – 1.8g` (Biến thiên tuần hoàn đều đặn theo nhịp bước chân).
*   **step_count:** Tăng đều liên tục theo thời gian (`~1 – 2.5 bước/giây`).
*   **gyro_peak (Vận tốc góc đỉnh):** `Vừa phải (50 – 150 deg/s)` theo dao động tự nhiên của tay/chân.
*   **gait_instability_score (Chỉ số loạng choạng dáng đi):** Thấp (`< 0.2`), dáng đi đều và vững chãi.
*   **posture:** `standing/walking` (đứng/đi).

---

### 6.2. Các Kịch bản Biến cố & Bệnh lý Cấp tính (Abnormal Scenarios)

#### A. Biến cố Ngã đột ngột (Fall Event)
Biến cố ngã cơ học tự do, va đập mạnh và mất khả năng di chuyển hoặc bất tỉnh sau đó. Tiến trình gồm 3 giai đoạn:

1.  **Trước biến cố (Pre-impact):**
    *   **Trạng thái:** Đang đi bộ (`walking`) hoặc đứng tĩnh (`standing`).
    *   **acc_rms:** Dao động bình thường của đi bộ (`1.0g – 1.8g`) hoặc đứng tĩnh (`~0.1g`).
2.  **Tại thời điểm biến cố (Impact/Collision):**
    *   **acc_peak_g (Gia tốc đỉnh):** Tăng vọt cực đại đột ngột (`> 3.0g` đến `5.0g` hoặc cao hơn) do lực va đập trực tiếp xuống mặt sàn.
    *   **jerk_peak (Tốc độ thay đổi gia tốc):** Tăng cực mạnh (`> 20g/s`) thể hiện quán tính rơi tự do và dừng đột ngột.
    *   **gyro_peak (Vận tốc góc đỉnh):** Tăng mạnh (`> 300 – 500 deg/s`) do cơ thể xoay chuyển nhanh ngoài tầm kiểm soát khi ngã.
3.  **Sau biến cố (Post-impact):**
    *   **posture_after (Tư thế sau ngã):** Nghiêng hẳn so với trục đứng (`lying` - nằm ngửa, nằm sấp hoặc nằm nghiêng một góc `> 60°`).
    *   **no_motion_duration (Thời gian bất động):** Tăng liên tục (`> 5 – 10 giây`) do người bệnh bị choáng, đau đớn hoặc ngất đi.
    *   **HR (Nhịp tim):** Tăng vọt nhanh (`> 100 bpm`) phản ứng hoảng sợ (fight-or-flight) hoặc chấn thương đau đớn.

#### B. Cảnh báo Đột quỵ cấp (Stroke Warning)
Không phải một sự kiện va chạm tức thời như ngã mà là chuỗi biến đổi sinh lý và suy giảm chức năng thần kinh/vận động tích tụ:
*   **Huyết áp kịch phát (Hypertension Crisis):** SBP tăng rất cao (`> 160 mmHg`, thậm chí `> 180 mmHg`) hoặc DBP `> 100 mmHg` (Yếu tố nguy cơ vỡ hoặc tắc mạch máu não hàng đầu).
*   **Rung nhĩ & Nhịp tim bất ổn (AFib & Arrhythmia):**
    *   **AFib probability (Xác suất rung nhĩ):** Tăng cao (`> 0.6 – 0.9`). Rung nhĩ tạo huyết khối gây tắc mạch não.
    *   **HR irregular:** Khoảng cách các nhịp tim biến thiên cực kỳ hỗn loạn (HRV giảm sâu hoặc biến đổi phi quy luật).
*   **Mất thăng bằng & Liệt vận động (Motor Impairment):**
    *   **gait_instability_score (Chỉ số loạng choạng):** Tăng mạnh (`> 0.6`) khi di chuyển (do yếu nửa người, đi kéo lê chân hoặc ảnh hưởng tiểu não).
    *   **activity_drop_score (Suy giảm vận động):** Tăng cao (`> 0.7`) ở một bên tay đeo thiết bị (giảm biên độ vung tay tự nhiên khi đi lại).
*   **Tín hiệu tự báo cáo (Self-report BE FAST):**
    *   Hệ thống hỏi nhanh trên màn hình hoặc giọng nói, ghi nhận phản hồi tích cực về méo mặt (**F**ace), yếu tay (**A**rm), khó nói (**S**peech), mờ mắt (**E**ye) -> Kích hoạt cảnh báo khẩn cấp cấp độ cao nhất.

#### C. Hạ đường huyết cấp (Hypoglycemia Warning) - *Mở rộng đặc biệt*
Tình trạng thiếu hụt glucose cung cấp cho tế bào não, gây suy nhược thần kinh và kích thích giao cảm mạnh mẽ:
*   **Glucose (Đường huyết giả định):** Giảm sâu dưới mức an toàn (`< 70 mg/dL` - mức cảnh báo, hoặc `< 55 mg/dL` - mức nguy kịch cần cấp cứu).
*   **HR (Nhịp tim):** Tăng nhanh phản ứng giao cảm (`90 – 120 bpm` khi đang nghỉ ngơi), tạo cảm giác hồi hộp trống ngực dữ dội.
*   **Gia tốc vi mô / Run tay (Micro-tremor):**
    *   **acc_tremor_rms:** Xuất hiện dao động gia tốc biên độ cực nhỏ nhưng tần số cao (`8 – 12 Hz`) ở cổ tay do run cơ học vô thức.
*   **Hoạt động chung:** Suy giảm nhanh, người bệnh lơ mơ, nằm nghỉ đột ngột hoặc ngồi bệt xuống (`activity_drop_score` tăng, `posture` chuyển sang nằm/ngồi).

#### D. Ngưng thở khi ngủ / Giảm oxy máu (Hypoxia Event) - *Mở rộng đặc biệt*
*   **SpO₂:** Giảm sâu đột ngột dưới mức sinh lý thông thường (`< 90%` hoặc tụt dốc `> 4%` trong vòng 30 giây).
*   **HR (Nhịp tim):** Biến thiên hình chữ U (nhịp tim chậm lại lúc thiếu oxy, sau đó tăng vọt `> 100 bpm` khi cơ thể giật mình tỉnh giấc để lấy lại nhịp thở).
*   **Motion:** Kèm theo các cú giật mình chuyển động mạnh đột ngột trong khi ngủ (gia tốc đỉnh ngắn sau giai đoạn bất động hoàn toàn).
*   **posture:** `lying` (nằm).

---
