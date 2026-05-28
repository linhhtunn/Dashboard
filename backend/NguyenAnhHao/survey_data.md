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

