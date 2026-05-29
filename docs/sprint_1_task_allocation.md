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
| **Team 1 người 1** | **Day 1** | Đăng ký các tài khoản Cloud (Supabase, CloudAMQP). Viết file Pydantic Schema định dạng dữ liệu đầu vào. | Tài khoản hoạt động + File `backend/contracts/sensor_data.py`. |
| | **Day 2** | Thiết lập cấu trúc các bảng DB Schema v1 trên Supabase và viết script seeding 10 bệnh nhân mẫu. | **[Bàn giao DB]** Các bảng DB đã tạo kèm dữ liệu mẫu. |
| | **Day 3** | Cấu hình Exchange, Queue và Routing key trên CloudAMQP. | **[Bàn giao Broker]** Thông tin kết nối queue trực tuyến sẵn sàng. |
| | **Day 4 - Day 5** | Hỗ trợ viết script Simulator bắn dữ liệu thô nhịp tim/huyết áp lên RabbitMQ. | Code Simulator kết nối thành công RabbitMQ qua giao thức `amqps://`. |
| | **Day 6** | Hỗ trợ Team 2 & 4 tích hợp luồng dữ liệu thô liên tục và debug kết nối. | Luồng dữ liệu chạy ổn định từ Simulator lên Broker. |
| **Team 1 người 2** | **Day 1 - Day 2** | Nghiên cứu y học, viết tài liệu sinh lý học chốt dải chỉ số nhịp tim, huyết áp, SpO2 làm gốc cho Simulator. | Tài liệu `docs/dataset_review.md` (Team 3 người 1 và Team 2 người 1 sẽ dùng chung). |
| | **Day 3** | Xây dựng logic Simulator sinh dữ liệu sinh hiệu bình thường (Normal Stream). | Module Simulator sinh dữ liệu ngẫu nhiên có kiểm soát sinh lý. |
| | **Day 4 - Day 5** | Tích hợp cơ chế sinh nhiễu sinh lý học ngẫu nhiên vào dữ liệu Simulator. | Simulator hoàn chỉnh bắn tin nhắn định kỳ tần suất 1 Hz. |
| | **Day 6** | Viết file cấu hình chạy Docker và phối hợp chạy thử nghiệm E2E. | Dockerfile của Simulator hoạt động ổn định. |

---

### 2.2. TEAM 2: DATA INGESTION & CLEANING (1 nhân sự)
*   **Vai trò:** Nhận dữ liệu từ Broker, dọn dẹp lọc lỗi kỹ thuật phần cứng và lưu trữ cơ sở dữ liệu.

| Thành viên | Ngày | Tác vụ chi tiết | Sản phẩm đầu ra (Deliverables) |
| :--- | :--- | :--- | :--- |
| **Team 2 người 1** | **Day 1 - Day 2** | Tập trung viết module logic xử lý, kiểm tra dữ liệu thô và lọc lỗi sensor (Cleaning logic). Viết unit test chạy bằng dữ liệu JSON mẫu offline. | File `cleaner.py` + Bộ unit test offline thành công. |
| | **Day 3** | Tiếp nhận DB kết nối từ Team 1 người 1. Viết code Database Connector để lưu dữ liệu sạch vào Supabase. | Module Database Connector chèn dữ liệu sạch thành công vào Supabase DB. |
| | **Day 4** | Tiếp nhận CloudAMQP từ Team 1 người 1. Viết code Consumer kết nối tới CloudAMQP chốt queue đọc tin nhắn. | Worker Consumer kết nối thành công hàng đợi trực tuyến để đọc tin. |
| | **Day 5** | Ghép nối hoàn chỉnh luồng Consumer (Đọc Broker -> Dọn dẹp -> Ghi DB) và chạy thử nghiệm. | Dữ liệu thô và sạch được ghi tự động vào các bảng Supabase. |
| | **Day 6** | Phối hợp tích hợp E2E toàn hệ thống, đo đạc tốc độ insert dữ liệu vào database. | Toàn bộ đường ống dẫn dữ liệu chạy ổn định thời gian thực. |

---

### 2.3. TEAM 3: RULE-BASED ANOMALY (1 nhân sự)
*   **Vai trò:** Quét dữ liệu sạch từ cơ sở dữ liệu và phát hiện bất thường sinh học dựa trên ngưỡng cố định.

| Thành viên | Ngày | Tác vụ chi tiết | Sản phẩm đầu ra (Deliverables) |
| :--- | :--- | :--- | :--- |
| **Team 3 người 1** | **Day 1 - Day 2** | Tiếp nhận tài liệu `docs/dataset_review.md` từ Team 1 người 2 để lấy dải sinh lý học. Dựng khung xương Rule Engine. | File cấu hình `thresholds_config.py` chứa các ngưỡng sinh lý động/tĩnh. |
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

### 2.5. TEAM 5: AI AGENT & VALIDATION SUPPORT (1 nhân sự)
*   **Vai trò:** Phát triển trợ lý AI Agent, tóm tắt bệnh án y sinh và giải thích nguyên nhân cảnh báo.

| Thành viên | Ngày | Tác vụ chi tiết | Sản phẩm đầu ra (Deliverables) |
| :--- | :--- | :--- | :--- |
| **Team 5 người 1** | **Day 1 - Day 2** | Setup project FastAPI cho AI Agent, cấu hình kết nối API của LLM (OpenAI/Gemini). | Server FastAPI AI Agent chạy được cục bộ. |
| | **Day 3** | Thiết lập System Prompt y khoa chuẩn và cơ chế bảo mật (Guardrails) cơ bản cho Agent. | System Prompt chốt vai trò trợ lý y khoa hạn chế ảo tưởng thông tin. |
| | **Day 4 - Day 5** | Viết logic API endpoints `/api/agent/summary` và `/explain-alert` sinh dữ liệu JSON tĩnh theo Data Contract. | Phản hồi của Agent chứa cấu trúc JSON chuẩn (bao gồm Markdown giải thích + mảng vẽ chart). |
| | **Day 6** | Kết nối FastAPI AI Agent với Database thực tế để lấy dữ liệu sinh hiệu điền vào Context của Prompt. | AI Agent tóm tắt và giải thích được dựa trên số liệu thực tế trong DB. |
