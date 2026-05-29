# KẾ HOẠCH ISSUE THEO NGÀY - SPRINT 1 (TEAM 1)
## ĐỀ TÀI: E2E SIMULATION FOR AI HEALTH

Tài liệu này chứa danh sách **6 Github Issues** tương ứng với 6 ngày làm việc của **Team 1 (DATA SIMULATOR & BROKER/DB SETUP)**. Mỗi issue được thiết kế đầy đủ các phần: **Tiêu đề**, **Mục tiêu (Objective/Goals)**, **Mô tả công việc (Description/Tasks)**, **Sản phẩm đầu ra (Deliverables/Output)**, **Định nghĩa hoàn thành (Definition of Done - DoD)**, **Tiêu chí Thành công (Successful)**, và **Tiêu chí Thất bại (Failed)**.

---

### [Team 1 - Day 1] Nghiên cứu Sinh hiệu, Thiết lập Cloud & Định nghĩa Hợp đồng Dữ liệu (Pydantic Schema)

*   **Mục tiêu (Objective & Goals):**
    *   Cùng nghiên cứu y học cơ bản, thống nhất dải chỉ số sinh hiệu (nhịp tim, huyết áp, SpO2) làm gốc để định nghĩa dải sinh dữ liệu.
    *   Xây dựng nền móng hạ tầng trực tuyến cho toàn bộ dự án gồm cơ sở dữ liệu (Supabase/PostgreSQL) và hệ thống hàng đợi tin nhắn (CloudAMQP/RabbitMQ).
    *   Định nghĩa chuẩn dữ liệu đầu vào cho luồng sensor y sinh để các team khác (Team 2 - Ingestion, Team 4 - Frontend) có thể làm việc song song.
*   **Mô tả công việc (Description & Tasks):**
    *   [ ] Cùng nghiên cứu tài liệu y khoa cơ bản, thảo luận thống nhất dải chỉ số sinh hiệu chuẩn (nhịp tim, huyết áp, SpO2) để làm căn cứ thiết lập dữ liệu Simulator.
    *   [ ] Đăng ký và cấu hình dự án mới trên **Supabase** (lấy thông tin kết nối Connection String).
    *   [ ] Đăng ký tài khoản **CloudAMQP**, tạo instance RabbitMQ mới (lấy địa chỉ kết nối `amqps://`).
    *   [ ] Tạo tệp cấu hình môi trường mẫu `.env.example` chứa thông tin kết nối DB và Broker.
    *   [ ] Viết file Pydantic Schema định dạng dữ liệu đầu vào tại `backend/contracts/sensor_data.py` (bao gồm các trường: `patient_id`, `timestamp`, `heart_rate`, `blood_pressure` [systolic/diastolic], `spo2`).
*   **Sản phẩm đầu ra (Deliverables):**
    *   Thống nhất dải chỉ số sinh hiệu y sinh làm cơ sở viết schema và tài liệu sinh lý học sau này.
    *   Tài khoản CloudAMQP và Supabase hoạt động ở chế độ trực tuyến.
    *   File `.env.example` hoàn thiện trong dự án.
    *   Tệp Pydantic Schema `backend/contracts/sensor_data.py`.
*   **Định nghĩa hoàn thành (Definition of Done - DoD):**
    *   Các biến kết nối trong `.env.example` đầy đủ và chính xác.
    *   Tệp `backend/contracts/sensor_data.py` không có lỗi cú pháp và chạy kiểm thử validation (offline) với dữ liệu JSON mẫu thành công.
*   **Tiêu chí Thành công (Successful):**
    *   Hoàn thành trước hạn, Schema y sinh được tối ưu hóa, hỗ trợ kiểm tra kiểu dữ liệu chặt chẽ và không cần sửa lại sau khi bàn giao.
*   **Tiêu chí Thất bại (Failed):**
    *   Không đăng ký được tài khoản Cloud do lỗi thanh toán/xác thực, hoặc file Schema định nghĩa sai/thiếu trường y sinh quan trọng khiến Team 2 (Ingestion) bị nghẽn không thể thiết kế logic dọn dẹp dữ liệu thô.

---

### [Team 1 - Day 2] Thiết kế Schema DB trên Supabase & Script Seeding Bệnh nhân

*   **Mục tiêu (Objective & Goals):**
    *   Triển khai cấu trúc bảng cơ sở dữ liệu vật lý trên Supabase phục vụ lưu trữ thông tin bệnh nhân, dữ liệu sinh hiệu sạch và lịch sử cảnh báo.
    *   Cung cấp dữ liệu mẫu gồm 10 bệnh nhân để phục vụ hiển thị trên Dashboard và làm tài liệu sinh lý học tham chiếu cho các module phát hiện bất thường.
*   **Mô tả công việc (Description & Tasks):**
    *   [ ] Thiết kế cấu trúc bảng DB Schema v1 gồm các bảng chính: `patients` (thông tin cá nhân), `clean_vitals` (lưu sinh hiệu đã lọc sạch), và `health_alerts` (lưu vết cảnh báo).
    *   [ ] Viết mã lệnh SQL DDL để tạo bảng, khóa chính (Primary Key), khóa ngoại (Foreign Key) và đánh index cơ bản.
    *   [ ] Viết script SQL hoặc Python (`seed.py`) để nạp tự động (seeding) thông tin của 10 bệnh nhân mẫu với các bệnh lý nền khác nhau.
    *   [ ] Nghiên cứu và hoàn thiện tài liệu sinh lý học `docs/dataset_review.md` xác định dải chỉ số nhịp tim, huyết áp, SpO2 (bình thường vs bất thường).
*   **Sản phẩm đầu ra (Deliverables):**
    *   **[Bàn giao DB]** Các bảng dữ liệu đã được tạo thành công trực tuyến trên Supabase.
    *   Mã nguồn script khởi tạo database và script seed dữ liệu mẫu trong thư mục `backend/db/`.
    *   Tài liệu y học `docs/dataset_review.md` được lưu trong repository.
*   **Định nghĩa hoàn thành (Definition of Done - DoD):**
    *   Có thể thực hiện câu lệnh truy vấn `SELECT * FROM patients` và trả về đúng 10 dòng dữ liệu bệnh nhân mẫu trên console của Supabase.
    *   Tài liệu `docs/dataset_review.md` chứa thông tin dải chỉ số rõ ràng cho từng độ tuổi/trạng thái sức khỏe để các team khác tham chiếu.
*   **Tiêu chí Thành công (Successful):**
    *   Thiết kế DB Schema tối ưu, có các cơ chế ràng buộc toàn vẹn dữ liệu tốt. Tài liệu y học chi tiết vượt mong đợi, giúp Team 3 xây dựng Rule Engine cực kỳ nhanh chóng.
*   **Tiêu chí Thất bại (Failed):**
    *   Không tạo được các bảng DB, cấu trúc bảng bị thiếu khóa ngoại liên kết hoặc script seeding bị lỗi cú pháp. Tài liệu y học không chốt được dải chỉ số cụ thể, gây mơ hồ cho Rule-based Engine.

---

### [Team 1 - Day 3] Cấu hình Broker Topology & Xây dựng Cốt lõi Simulator (Normal Stream)

*   **Mục tiêu (Objective & Goals):**
    *   Thiết lập luồng định tuyến tin nhắn (Broker Topology) trên CloudAMQP để chuẩn bị nhận dữ liệu từ Simulator truyền đến Consumer.
    *   Lập trình thành công hạt nhân của bộ giả lập (Simulator Core) có khả năng sinh dữ liệu sinh lý học bình thường theo thời gian thực.
*   **Mô tả công việc (Description & Tasks):**
    *   [ ] Truy cập Dashboard CloudAMQP, tạo Exchange (ví dụ: `vitals_exchange` loại `direct` hoặc `topic`).
    *   [ ] Tạo Queue (ví dụ: `raw_vitals_queue`) và thiết lập Binding nối queue với exchange qua Routing Key cụ thể.
    *   [ ] Viết logic Python sinh số ngẫu nhiên có kiểm soát (sử dụng phân phối xác suất hoặc thuật toán toán học) để tạo ra luồng sinh hiệu nhịp tim (60-90 bpm), huyết áp (110/70 - 130/85 mmHg) và SpO2 (96-99%) bình thường.
*   **Sản phẩm đầu ra (Deliverables):**
    *   **[Bàn giao Broker]** Thông số kết nối Exchange, Queue, Routing key sẵn sàng cho các team.
    *   Module mã nguồn Python `simulator/core/generator.py` chịu trách nhiệm sinh dữ liệu sinh hiệu bình thường.
*   **Định nghĩa hoàn thành (Definition of Done - DoD):**
    *   Broker Dashboard hiển thị hàng đợi hoạt động tốt (State: Idle/Active, Message rate: 0).
    *   Chạy module simulator offline trên console hiển thị luồng dữ liệu JSON sinh ra liên tục khớp chính xác với định dạng Pydantic Schema.
*   **Tiêu chí Thành công (Successful):**
    *   Simulator sinh dữ liệu mượt mà, các chỉ số biến thiên tự nhiên như người thật (không bị nhảy số quá đột ngột) và cấu hình Broker hoàn tất chỉ trong nửa ngày.
*   **Tiêu chí Thất bại (Failed):**
    *   Cấu hình sai Binding trên CloudAMQP làm Broker không định tuyến được tin nhắn. Simulator sinh số nằm ngoài phạm vi sinh học thực tế hoặc lỗi logic toán học gây treo tiến trình.

---

### [Team 1 - Day 4] Tích hợp Giao thức AMQPS & Cơ chế Bơm Nhiễu Sinh lý Học

*   **Mục tiêu (Objective & Goals):**
    *   Kết nối trực tiếp bộ Simulator với Broker CloudAMQP bằng giao thức bảo mật `amqps://`.
    *   Xây dựng cơ chế chèn nhiễu sinh lý học ngẫu nhiên (anomaly/noise injection) vào luồng dữ liệu giả lập để kiểm thử khả năng lọc nhiễu của Consumer và phát hiện lỗi của Rule Engine.
*   **Mô tả công việc (Description & Tasks):**
    *   [ ] Sử dụng thư viện `pika` (hoặc thư viện AMQP tương đương) để kết nối Simulator tới CloudAMQP.
    *   [ ] Lập trình logic kết nối an toàn sử dụng các biến cấu hình từ tệp `.env`.
    *   [ ] Phát triển module chèn nhiễu sinh học: thỉnh thoảng (với xác suất nhỏ 2-5%) tự động tạo ra một vài bản ghi có chỉ số bất thường nguy kịch (ví dụ: nhịp tim vọt lên 150 bpm hoặc SpO2 tụt xuống 88%) hoặc lỗi sensor vật lý (ví dụ: mất tín hiệu bằng cách trả về giá trị null).
*   **Sản phẩm đầu ra (Deliverables):**
    *   Mã nguồn Simulator tích hợp AMQP Client tại thư mục `simulator/main.py`.
    *   Cơ chế bơm nhiễu sinh lý học được cấu hình thông qua các tham số đầu vào.
*   **Định nghĩa hoàn thành (Definition of Done - DoD):**
    *   Chạy script Simulator gửi thành công tin nhắn lên hàng đợi trực tuyến CloudAMQP.
    *   Kiểm tra số lượng tin nhắn trên Broker Dashboard tăng lên tương ứng và nội dung tin nhắn thỉnh thoảng xuất hiện các điểm nhiễu sinh lý.
*   **Tiêu chí Thành công (Successful):**
    *   Dữ liệu được gửi lên Broker với độ trễ cực thấp (< 50ms). Cơ chế bơm nhiễu hoạt động chuẩn xác theo cấu hình tham số động.
*   **Tiêu chí Thất bại (Failed):**
    *   Simulator không thể kết nối tới CloudAMQP qua giao thức SSL (`amqps://`), bị từ chối kết nối (chặn IP/lỗi xác thực), hoặc payload gửi đi bị lỗi format JSON làm Broker không nhận dạng được.

---

### [Team 1 - Day 5] Tối ưu hóa Chu kỳ Phát 1 Hz & Cơ chế Tự động Phục hồi Kết nối

*   **Mục tiêu (Objective & Goals):**
    *   Đảm bảo Simulator phát tín hiệu đồng đều với tần suất chuẩn xác 1 Hz (1 tin nhắn mỗi giây) mà không bị trôi thời gian (drift).
    *   Tăng cường độ bền vững hệ thống bằng cách viết cơ chế tự động kết nối lại (Auto-reconnect / Recovery) khi mất mạng hoặc Broker gặp sự cố.
*   **Mô tả công việc (Description & Tasks):**
    *   [ ] Tối ưu hóa vòng lặp thời gian trong Python, thay thế hàm `time.sleep(1)` đơn giản bằng cơ chế tính toán khoảng bù thời gian thực tế để đảm bảo tần suất phát đạt 1 Hz ổn định.
    *   [ ] Viết khối lệnh `try-except` bắt lỗi kết nối mạng (Socket error, Connection closed, Connection reset).
    *   [ ] Triển khai thuật toán Exponential Backoff (thử lại sau 1s, 2s, 4s, 8s,... đến tối đa 60s) để Simulator tự phục hồi kết nối mà không bị crash hệ thống.
*   **Sản phẩm đầu ra (Deliverables):**
    *   File mã nguồn `simulator/main.py` đã được tối ưu hóa chu kỳ phát và tích hợp logic phục hồi kết nối kiên cố.
*   **Định nghĩa hoàn thành (Definition of Done - DoD):**
    *   Simulator chạy liên tục trong 30 phút mà không có bất kỳ sai lệch nào về chu kỳ phát (giữ vững tần số 1 Hz).
    *   Thử nghiệm ngắt kết nối mạng thủ công (hoặc restart Broker) -> Simulator tự động phát hiện lỗi kết nối, liên tục retry theo chính sách Exponential Backoff và tự động gửi tiếp dữ liệu ngay khi mạng kết nối trở lại.
*   **Tiêu chí Thành công (Successful):**
    *   Simulator có thể duy trì hoạt động bền bỉ, xử lý lỗi kết nối cực kỳ mượt mà, không rò rỉ bộ nhớ (memory leak) trong quá trình kết nối lại liên tục.
*   **Tiêu chí Thất bại (Failed):**
    *   Vòng lặp phát tin bị lệch tần số nghiêm trọng (bắn quá nhanh hoặc quá chậm do tích tụ sai số thời gian). Simulator bị treo hoặc crash hẳn tiến trình khi mất kết nối Broker, buộc phải khởi động lại thủ công.

---

### [Team 1 - Day 6] Container hóa Docker & Tích hợp Thử nghiệm E2E Toàn Hệ thống

*   **Mục tiêu (Objective & Goals):**
    *   Đóng gói toàn bộ module Simulator vào bên trong Container Docker để dễ dàng triển khai trên mọi môi trường mà không bị xung đột thư viện.
    *   Phối hợp với Team 2 (Ingestion) và Team 4 (Dashboard) để chạy thử nghiệm toàn bộ hệ thống từ đầu đến cuối (E2E), đảm bảo luồng thông tin thông suốt thời gian thực.
*   **Mô tả công việc (Description & Tasks):**
    *   [ ] Viết tệp cấu hình `Dockerfile` gọn nhẹ cho Simulator (khuyên dùng python-alpine để tối ưu dung lượng).
    *   [ ] Xây dựng file cấu hình Docker Compose cơ bản để khởi chạy container Simulator cục bộ.
    *   [ ] Đồng hành với Team 2 tích hợp luồng: **Simulator (Docker) -> CloudAMQP Broker -> Consumer (Worker) -> Supabase PostgreSQL**.
    *   [ ] Phối hợp kiểm thử với Team 4: Đảm bảo dữ liệu sinh hiệu thay đổi trên Dashboard khớp đúng giá trị Simulator phát ra từng giây.
*   **Sản phẩm đầu ra (Deliverables):**
    *   File `simulator/Dockerfile` và cấu hình chạy container hoàn chỉnh.
    *   Hệ thống E2E thông suốt luồng dữ liệu thời gian thực (được chứng thực qua dữ liệu hiển thị trên Dashboard UI của Team 4).
*   **Định nghĩa hoàn thành (Definition of Done - DoD):**
    *   Docker image được build thành công không lỗi. Container chạy ngầm ổn định, tự động lấy các biến môi trường cấu hình từ tệp `.env`.
    *   Kiểm tra Dashboard UI hiển thị biểu đồ chạy liên tục đúng chu kỳ phát sinh của Simulator.
*   **Tiêu chí Thành công (Successful):**
    *   Dung lượng Docker Image tối giản (< 100MB), thời gian build nhanh. Buổi tích hợp E2E diễn ra suôn sẻ, toàn hệ thống kết nối đồng bộ không lỗi và độ trễ từ Simulator lên Dashboard nhỏ hơn 1 giây.
*   **Tiêu chí Thất bại (Failed):**
    *   Docker Image không build được do lỗi khai báo package, hoặc container liên tục bị crash loop khi khởi động. Luồng tích hợp E2E bị đứt gãy (ví dụ: dữ liệu không ghi được vào Supabase DB hoặc Dashboard không hiển thị được biểu đồ).
