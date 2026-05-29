# KẾ HOẠCH PHÂN CHIA NHIỆM VỤ SPRINT 1 (RÚT NGẮN: 6 NGÀY)
## ĐỀ TÀI: E2E SIMULATION FOR AI HEALTH

Sprint 1 được rút ngắn còn **6 ngày (làm việc từ Thứ Hai đến Thứ Bảy, nghỉ Chủ Nhật)**. Tiến độ được chia thành các bảng riêng biệt cho từng team để tiện theo dõi và báo cáo tiến độ độc lập.

---

## 1. TIÊU CHÍ HOÀN THÀNH SPRINT 1 (DEFINITION OF DONE - DOD)
1.  **Hạ tầng:** Broker (CloudAMQP) và DB PostgreSQL (Supabase/Neon) hoạt động trực tuyến.
2.  **Đầu nối:** Hoàn thành file Pydantic Schema `backend/contracts/sensor_data.py`.
3.  **Luồng chính (E2E):** Simulator phát dữ liệu bình thường → RabbitMQ → Consumer dọn dẹp ghi DB → Rule Engine quét phát hiện và tạo Alert thô → UI Mock hiển thị biểu đồ sinh động và chat với Agent.

---

## 2. BẢNG PHÂN CHIA NHIỆM VỤ THEO TỪNG TEAM (6 NGÀY)

### 2.1. TEAM 1: DATA SIMULATOR & BROKER/DB SETUP (2 nhân sự)
*   **Vai trò:** Thiết lập hạ tầng Cloud ban đầu, cung cấp tài liệu sinh lý học và lập trình bộ sinh dữ liệu Simulator.

| Thành viên | Ngày | Tác vụ chi tiết | Sản phẩm đầu ra (Deliverables) |
| :--- | :--- | :--- | :--- |
| **Team 1 (2 người)** <br>*(Đồng hành)* | **Day 1** | Cùng nghiên cứu y học, thống nhất dải chỉ số sinh hiệu (nhịp tim, huyết áp, SpO2). Đăng ký tài khoản Cloud (Supabase, CloudAMQP) và viết file Pydantic Schema cho dữ liệu đầu vào. | Tài khoản hoạt động + File `backend/contracts/sensor_data.py`. |
| | **Day 2** | Thiết lập cấu trúc các bảng DB Schema v1 trên Supabase, viết script seeding 10 bệnh nhân mẫu, đồng thời hoàn thiện tài liệu sinh lý học. | **[Bàn giao DB]** Các bảng DB đã tạo kèm dữ liệu mẫu + Tài liệu `docs/dataset_review.md` (Team 3 người 1 và Team 2 người 1 sẽ dùng chung). |
| | **Day 3** | Cấu hình Exchange, Queue, Routing key trên CloudAMQP và xây dựng logic cốt lõi của Simulator sinh dữ liệu sinh hiệu bình thường (Normal Stream). | **[Bàn giao Broker]** Thông tin kết nối queue trực tuyến sẵn sàng + Module Simulator sinh dữ liệu ngẫu nhiên có kiểm soát sinh lý. |
| | **Day 4** | Phát triển module Simulator: tích hợp cơ chế sinh nhiễu sinh lý học ngẫu nhiên và viết logic kết nối gửi dữ liệu qua giao thức `amqps://` lên CloudAMQP. | Code Simulator kết nối thành công RabbitMQ qua giao thức `amqps://` và phát tín hiệu thô có nhiễu. |
| | **Day 5** | Tối ưu hóa bộ sinh dữ liệu Simulator (phát định kỳ tần suất 5 Hz), kiểm thử việc gửi tin nhắn liên tục ổn định và xử lý lỗi kết nối Broker. | Simulator hoàn chỉnh bắn tin nhắn định kỳ tần suất 5 Hz. |
| | **Day 6** | Viết file cấu hình Docker cho Simulator; đồng hành cùng Team 2, 4 tích hợp luồng dữ liệu thô liên tục và hỗ trợ debug chạy thử nghiệm E2E toàn hệ thống. | Dockerfile của Simulator hoạt động ổn định + Luồng dữ liệu chạy ổn định từ Simulator lên Broker. |

---

### 2.2. TEAM 2: DATA INGESTION & CLEANING (1 nhân sự)
*   **Vai trò:** Nhận dữ liệu từ Broker, dọn dẹp lọc lỗi kỹ thuật phần cứng và lưu trữ cơ sở dữ liệu.

| Thành viên | Ngày | Tác vụ chi tiết | Sản phẩm đầu ra (Deliverables) |
| :--- | :--- | :--- | :--- |
| **Team 2 người 1** | **Day 1 - Day 2** | Tập trung viết module logic xử lý, kiểm tra dữ liệu thô và lọc lỗi sensor (Cleaning logic). Viết unit test chạy bằng dữ liệu JSON mẫu offline. | File `cleaner.py` + Bộ unit test offline thành công. |
| | **Day 3** | Tiếp nhận DB kết nối từ Team 1. Viết code Database Connector để lưu dữ liệu sạch vào Supabase. | Module Database Connector chèn dữ liệu sạch thành công vào Supabase DB. |
| | **Day 4** | Tiếp nhận CloudAMQP từ Team 1. Viết code Consumer kết nối tới CloudAMQP chốt queue đọc tin nhắn. | Worker Consumer kết nối thành công hàng đợi trực tuyến để đọc tin. |
| | **Day 5** | Ghép nối hoàn chỉnh luồng Consumer (Đọc Broker -> Dọn dẹp -> Ghi DB) và chạy thử nghiệm. | Dữ liệu thô và sạch được ghi tự động vào các bảng Supabase. |
| | **Day 6** | Phối hợp tích hợp E2E toàn hệ thống, đo đạc tốc độ insert dữ liệu vào database. | Toàn bộ đường ống dẫn dữ liệu chạy ổn định thời gian thực. |

---

### 2.3. TEAM 3: RULE-BASED ANOMALY (1 nhân sự)
*   **Vai trò:** Quét dữ liệu sạch từ cơ sở dữ liệu và phát hiện bất thường sinh học dựa trên ngưỡng cố định.

| Thành viên | Ngày | Tác vụ chi tiết | Sản phẩm đầu ra (Deliverables) |
| :--- | :--- | :--- | :--- |
| **Team 3 người 1** | **Day 1 - Day 2** | Tiếp nhận tài liệu `docs/dataset_review.md` từ Team 1 để lấy dải sinh lý học. Dựng khung xương Rule Engine. | File cấu hình `thresholds_config.py` chứa các ngưỡng sinh lý động/tĩnh. |
| | **Day 3** | Thiết lập cấu trúc dữ liệu và kết nối DB để chuẩn bị ghi nhận cảnh báo bất thường. | Kết nối Database từ module Rule Engine được thiết lập thành công. |
| | **Day 4 - Day 5** | Viết logic Rule-based Engine v1 phát hiện vượt ngưỡng tĩnh (nhịp tim, huyết áp) và chèn alert y sinh vào DB. | Script Rule Worker chạy ngầm, tự động tạo alert vào bảng `health_alerts` khi có chỉ số vượt ngưỡng. |
| | **Day 6** | Chạy thử nghiệm phát hiện bất thường với luồng dữ liệu của Simulator gửi lên DB. | Alert được kích hoạt tự động đúng logic y tế. |

---

### 2.4. TEAM 4: DOCTOR-FACING DASHBOARD (FRONTEND) (2 nhân sự)
*   **Vai trò:** Phát triển giao diện Bác sĩ, hiển thị biểu đồ sinh hiệu động thời gian thực và khung chat thông minh.

| Thành viên | Ngày | Tác vụ chi tiết | Sản phẩm đầu ra (Deliverables) |
| :--- | :--- | :--- | :--- |
| **Team 4 người 1** | **Day 1 - Day 2** | Khởi tạo mã nguồn Next.js/Tailwind CSS/TypeScript và dựng khung Layout Grid chính của Dashboard. | Project skeleton chạy local + Giao diện Layout trống. |
| | **Day 3** | Thiết kế UI trang danh sách bệnh nhân (Patient List) sử dụng dữ liệu Mock tĩnh. | Trang hiển thị danh sách bệnh nhân và phân loại cảnh báo. |
| | **Day 4 - Day 5** | Xây dựng UI trang chi tiết bệnh nhân (Patient Detail) gồm biểu đồ động (bằng Recharts) và bảng lịch sử alert. | Màn hình sinh hiệu chạy động theo mốc thời gian. |
| | **Day 6** | Thay thế mock data bằng việc gọi REST API Backend thực tế để hiển thị sinh hiệu. | Dashboard hiển thị đúng dữ liệu thật lấy từ Database. |
| **Team 4 người 2** | **Day 1 - Day 2** | Thiết lập local Mock Server (API Routes) để cung cấp dữ liệu thử nghiệm cho Frontend. | Các đầu API mock `/api/patients` và `/api/vitals` sẵn sàng. |
| | **Day 3** | Xây dựng component Chatbot UI tích hợp vào màn hình Patient Detail (hỗ trợ hiển thị văn bản Markdown). | Khung chat trực quan, giao diện bong bóng tin nhắn. |
| | **Day 4 - Day 5** | Viết code gọi API Mock Agent để kiểm tra tính tương tác của khung chat. | Chatbot phản hồi giả lập thành công câu trả lời Markdown + JSON. |
| | **Day 6** | Kết nối Chatbot UI với API của AI Agent dịch vụ thực tế. | Bác sĩ có thể chat hỏi đáp thông tin y tế thời gian thực. |

---

### 2.5. TEAM 5: AI AGENT & VALIDATION SUPPORT (1 nhân sự - Nguyễn Đức Cường)
*   **Vai trò:** Phát triển trợ lý AI Agent, tóm tắt bệnh án y sinh, giải thích nguyên nhân cảnh báo và hỗ trợ đóng gói E2E.

| Thành viên | Ngày | Tác vụ chi tiết | Sản phẩm đầu ra (Deliverables) |
| :--- | :--- | :--- | :--- |
| **Team 5 người 1** | **Day 1 - Day 2** | Setup project FastAPI cho AI Agent. Cấu hình kết nối API của LLM (OpenAI/Gemini) qua thư viện chính thức. Hoàn thiện prompt cơ sở (`SYSTEM_PROMPT` với cơ chế Hybrid Output định dạng JSON chứa text Markdown + mảng dữ liệu vẽ đồ thị). | Khung dự án FastAPI chạy được local + file `.env.example` cấu hình khóa API + tệp `prompts.py` định nghĩa sẵn các mẫu prompt y khoa. |
| | **Day 3** | Thiết lập cơ chế Structured Output để ép LLM trả về đúng định dạng JSON Schema mong muốn. Triển khai logic bắt lỗi (fallback/retry) khi LLM sinh JSON sai cấu trúc. Cài đặt các cơ chế bảo mật (Guardrails) cơ bản trong System Prompt để ngăn chặn AI tư vấn thuốc hoặc đưa ra chẩn đoán xác định mà không có chỉ định trực tiếp. | Class validation bằng Pydantic kiểm chứng cấu trúc JSON trả về + Logic xử lý lỗi JSON an toàn. |
| | **Day 4 - Day 5** | Xây dựng các router API chính gồm: `POST /api/agent/chat` (hỗ trợ lưu lịch sử chat In-Memory theo `patient_id` để đàm thoại nhiều lượt), `POST /api/agent/summary` (tóm tắt trạng thái sinh hiệu), và `POST /api/agent/explain-alert` (giải thích cảnh báo). Viết logic sinh dữ liệu Mock JSON tĩnh khớp chuẩn Data Contract cho các endpoint này để bàn giao sớm cho Team 4 Frontend làm màn hình dashboard. | 3 API endpoints hoạt động hoàn chỉnh chạy bằng dữ liệu mock. Tài liệu/Postman collection test API. |
| | **Day 6** | Kết nối FastAPI AI Agent với Supabase Database thực tế để truy vấn dữ liệu từ bảng `patients`, `clean_vitals` và `health_alerts`. Viết hàm tự động chèn dữ liệu truy vấn từ DB vào prompt template để LLM trả lời dựa trên chỉ số thực tế. Đồng hành cùng Team 2 viết Dockerfile cho AI Agent và cấu hình file điều phối toàn hệ thống `docker-compose.yml`. | AI Agent hoạt động E2E bằng dữ liệu thật trong DB + File `Dockerfile` của Agent và file `docker-compose.yml` tích hợp toàn hệ thống. |

