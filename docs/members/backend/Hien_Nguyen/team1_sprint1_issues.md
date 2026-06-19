# SPRINT 1 ISSUES - TEAM 1
## PROJECT: E2E SIMULATION FOR AI HEALTH

---

### [Team 1 - Day 1] Cloud Setup, Pydantic Schema & Vital Signs Research

**Mục tiêu:**
- Thống nhất dải chỉ số sinh hiệu bình thường (nhịp tim, huyết áp, SpO2) làm cơ sở sinh dữ liệu.
- Thiết lập hạ tầng cloud: Supabase (PostgreSQL) và CloudAMQP (RabbitMQ).
- Định nghĩa chuẩn dữ liệu đầu vào (Pydantic schema) để các team khác có thể làm việc song song.

**Công việc:**
- [ ] `[A+B]` Nghiên cứu và thống nhất dải chỉ số sinh hiệu chuẩn cho simulator.
- [ ] `[A]` Đăng ký và cấu hình dự án trên **Supabase** (lấy connection string).
- [ ] `[A]` Viết Pydantic schema tại `backend/contracts/sensor_data.py` với các trường: `patient_id`, `timestamp`, `heart_rate`, `blood_pressure` (systolic/diastolic), `spo2`.
- [ ] `[B]` Đăng ký **CloudAMQP**, tạo instance RabbitMQ (lấy địa chỉ `amqps://`).
- [ ] `[B]` Tạo file `.env.example` chứa các biến kết nối DB và broker.

**Tiêu chí hoàn thành:**
- Tất cả biến kết nối trong `.env.example` đầy đủ và chính xác.
- `backend/contracts/sensor_data.py` không lỗi cú pháp, validation offline với dữ liệu JSON mẫu thành công.

**Thất bại:**
- Không đăng ký được tài khoản cloud (lỗi thanh toán/xác thực).
- Schema thiếu hoặc sai trường, khiến Team 2 (Ingestion) bị chặn không thể bắt đầu.

---

### [Team 1 - Day 2] DB Schema Design & Patient Seeding

**Mục tiêu:**
- Triển khai cấu trúc bảng DB trên Supabase để lưu thông tin bệnh nhân, sinh hiệu sạch và lịch sử cảnh báo.
- Nạp 10 bệnh nhân mẫu để hỗ trợ hiển thị Dashboard và làm tài liệu tham chiếu cho module phát hiện bất thường.

**Công việc:**
- [ ] `[A]` Thiết kế DB schema v1 với các bảng: `patients`, `clean_vitals`, `health_alerts`.
- [ ] `[A]` Viết SQL DDL tạo bảng với khóa chính, khóa ngoại và index cơ bản.
- [ ] `[B]` Viết script seed (`seed.py` hoặc SQL) để nạp 10 bệnh nhân mẫu với các bệnh lý nền khác nhau.
- [ ] `[B]` Verify dữ liệu trên Supabase: chạy các query kiểm tra (`SELECT`, thử INSERT lỗi để test constraint).
- [ ] `[A]` Viết `docs/dataset_review.md` ghi lại dải chỉ số bình thường và bất thường cho nhịp tim, huyết áp, SpO2.

**Tiêu chí hoàn thành:**
- `SELECT * FROM patients` trả về đúng 10 dòng trên Supabase console.
- `docs/dataset_review.md` có dải chỉ số rõ ràng theo từng độ tuổi/trạng thái sức khỏe để các team tham chiếu.

**Thất bại:**
- Không tạo được bảng, thiếu khóa ngoại, hoặc script seed bị lỗi cú pháp.
- `docs/dataset_review.md` không chốt được dải chỉ số cụ thể, gây mơ hồ cho Rule Engine.

---

### [Team 1 - Day 3] Broker Topology Setup & Normal Data Generator

**Mục tiêu:**
- Cấu hình luồng định tuyến tin nhắn trên CloudAMQP để nhận dữ liệu từ simulator và chuyển đến consumer.
- Xây dựng lõi simulator sinh dữ liệu sinh hiệu bình thường theo thời gian thực.

**Công việc:**
- [ ] `[A]` Trên dashboard CloudAMQP, tạo Exchange (ví dụ: `vitals_exchange`, loại `direct` hoặc `topic`).
- [ ] `[A]` Tạo Queue (ví dụ: `raw_vitals_queue`) và thiết lập binding với exchange qua routing key.
- [ ] `[B]` Viết logic Python sinh số ngẫu nhiên có kiểm soát: nhịp tim (60–90 bpm), huyết áp (110/70–130/85 mmHg), SpO2 (96–99%).

**Tiêu chí hoàn thành:**
- Broker dashboard hiển thị queue hoạt động với binding đúng.
- Chạy simulator offline in ra luồng JSON liên tục khớp chính xác với Pydantic schema.

**Thất bại:**
- Cấu hình sai binding trên CloudAMQP khiến tin nhắn không được định tuyến.
- Simulator sinh giá trị ngoài dải sinh học hoặc bị crash do lỗi logic.

---

### [Team 1 - Day 4] AMQPS Integration & Anomaly Injection

**Mục tiêu:**
- Kết nối simulator với CloudAMQP qua giao thức bảo mật `amqps://`.
- Thêm cơ chế sinh dữ liệu bất thường/dị thường để kiểm thử khả năng lọc của Consumer và phát hiện lỗi của Rule Engine.

**Công việc:**
- [ ] `[A]` Dùng thư viện `pika` (hoặc tương đương) kết nối simulator tới CloudAMQP qua SSL.
- [ ] `[A]` Tải cấu hình kết nối an toàn từ file `.env`.
- [ ] `[B]` Xây dựng module sinh dữ liệu bất thường: với xác suất ~2–5%, tự động sinh chỉ số bất thường nguy kịch (ví dụ: nhịp tim 150 bpm, SpO2 88%) hoặc lỗi sensor (giá trị null).

**Tiêu chí hoàn thành:**
- Simulator gửi tin nhắn thành công lên queue CloudAMQP đang chạy thực.
- Broker dashboard hiển thị số lượng tin nhắn tăng dần, thỉnh thoảng có payload dị thường.

**Thất bại:**
- Simulator không kết nối được CloudAMQP qua SSL (bị từ chối, lỗi xác thực).
- Payload JSON bị lỗi format và bị broker từ chối.

---

### [Team 1 - Day 5] 1 Hz Timing Optimization & Auto-Reconnect

**Mục tiêu:**
- Đảm bảo simulator phát đúng tần số 1 Hz ổn định, không bị trôi thời gian.
- Thêm cơ chế tự động kết nối lại khi mất mạng hoặc broker gặp sự cố.

**Công việc:**
- [ ] `[A]` Thay `time.sleep(1)` bằng vòng lặp tính bù thời gian thực tế để duy trì đúng 1 Hz.
- [ ] `[B]` Thêm `try-except` bắt lỗi kết nối (socket error, connection closed/reset).
- [ ] `[B]` Triển khai thuật toán Exponential Backoff retry (1s → 2s → 4s → ... → tối đa 60s) khi mất kết nối.

**Tiêu chí hoàn thành:**
- Simulator chạy liên tục 30 phút không bị lệch tần số (giữ vững 1 Hz).
- Ngắt mạng thủ công hoặc restart broker → simulator tự retry theo backoff và tự gửi tiếp khi kết nối trở lại.

**Thất bại:**
- Vòng lặp phát tin bị lệch tần số nghiêm trọng (quá nhanh hoặc quá chậm do tích tụ sai số).
- Simulator bị treo hoặc crash khi broker ngắt kết nối, phải khởi động lại thủ công.

---

### [Team 1 - Day 6] Containerization & E2E Integration Test

**Mục tiêu:**
- Đóng gói toàn bộ simulator vào container để triển khai trên mọi môi trường mà không bị xung đột thư viện.
- Chạy kiểm thử E2E cùng Team 2 (Ingestion) và Team 4 (Dashboard) để xác nhận toàn bộ luồng dữ liệu thông suốt.

**Công việc:**
- [ ] `[A]` Viết `Dockerfile` gọn nhẹ cho simulator (khuyên dùng `python-alpine` để tối ưu dung lượng).
- [ ] `[A]` Viết `docker-compose.yml` cơ bản để chạy container cục bộ.
- [ ] `[B]` Tích hợp với Team 2: **Simulator (Container) → CloudAMQP → Consumer → Supabase PostgreSQL**.
- [ ] `[B]` Kiểm thử với Team 4: xác nhận giá trị Dashboard khớp đúng với output simulator từng giây.

**Tiêu chí hoàn thành:**
- Image build thành công không lỗi, container chạy ổn định và tự load config từ `.env`.
- Dashboard hiển thị biểu đồ cập nhật liên tục khớp với dữ liệu simulator thời gian thực.

**Thất bại:**
- Image không build được (lỗi khai báo package) hoặc container liên tục crash-loop khi khởi động.
- Luồng E2E bị đứt gãy (dữ liệu không ghi được vào Supabase hoặc Dashboard không hiển thị).
