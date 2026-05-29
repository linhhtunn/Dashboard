# TEAM 5 - AI AGENT GITHUB ISSUES (SPRINT 1)
## PHỤ TRÁCH: NGUYỄN ĐỨC CƯỜNG

Tài liệu này chia các công việc của Team 5 trong Sprint 1 thành 4 GitHub Issues chi tiết để báo cáo và quản lý tiến độ.

---

### ISSUE 1: [Team 5] Setup FastAPI Project, LLM Integration & Prompt Engineering
*   **Start - End date:** Day 1 - Day 2 (Thứ Hai - Thứ Ba)
*   **Scope:**
    *   Khởi tạo cấu trúc thư mục dự án FastAPI (`backend/ai_agent/`).
    *   Cấu hình file `requirements.txt` cài đặt các thư viện cần thiết (FastAPI, uvicorn, openai/google-generativeai, pydantic, python-dotenv, tenacity, pytest, pytest-asyncio).
    *   Tạo file cấu hình môi trường `.env.example` (cổng PORT, khóa API của LLM).
    *   Thiết lập cơ chế gọi LLM bất đồng bộ (`async`/`await` với `AsyncOpenAI` hoặc Gemini Async client) để tránh block luồng xử lý của server khi có nhiều request đồng thời.
    *   Thiết kế hệ thống Logging ghi nhận chi tiết cuộc gọi LLM (thời gian phản hồi, số token tiêu thụ, chi phí ước tính, log lỗi).
    *   Cấu hình framework kiểm thử `pytest` và `pytest-asyncio` chuẩn bị cho việc viết unit test.
    *   Thiết kế prompt cơ sở `SYSTEM_PROMPT` trong `prompts.py` định hình vai trò trợ lý lâm sàng AI (AI Clinical Assistant) và quy định trả về định dạng **Hybrid JSON Output** (chứa narrative markdown + tọa độ vẽ biểu đồ/bảng).
*   **Output:**
    *   Project FastAPI chạy được ở local với cấu trúc Logger và Pytest hoạt động tốt.
    *   File `backend/ai_agent/prompts.py` hoàn chỉnh chứa các prompt thô.
    *   File `.env.example` cấu hình khóa API.

---

### ISSUE 2: [Team 5] Structured Output Validation & Safety Guardrails
*   **Start - End date:** Day 3 (Thứ Tư)
*   **Scope:**
    *   Thiết lập các lớp Pydantic Model để ép kiểu cấu trúc dữ liệu trả về từ LLM (Structured Output) đúng khớp với định dạng Hybrid JSON đã quy định trong Data Contract.
    *   Lập trình logic xác thực JSON trả về từ LLM.
    *   Xây dựng cơ chế xử lý lỗi (fallback/retry) tự động khi LLM sinh JSON lỗi cú pháp hoặc sai cấu trúc thuộc tính.
    *   Lập trình cơ chế thử lại tự động với độ trễ tăng dần (Retry with Exponential Backoff) khi gặp lỗi mạng hoặc lỗi Rate Limit (HTTP 429) bằng thư viện `tenacity`.
    *   Xây dựng bộ tiền lọc (Pre-filter) tin nhắn người dùng đầu vào để phát hiện và ngăn chặn các hành vi tấn công Prompt Injection (ví dụ: người dùng cố tình ghi đè hướng dẫn hệ thống).
    *   Bổ sung các lớp kiểm duyệt nội dung an toàn y khoa (**Clinical Guardrails**) ngay trong Prompt (ví dụ: cấm kê đơn thuốc tự ý, bắt buộc đính kèm disclaimer cảnh báo y khoa, chống ảo tưởng thông tin khi thiếu dữ liệu).
*   **Output:**
    *   Code validation đầu ra chạy thành công, tích hợp module xử lý retry của `tenacity`.
    *   Bộ lọc prompt ngăn chặn AI đưa ra các chỉ định y khoa ngoài thẩm quyền và chống tấn công Prompt Injection thành công.

---

### ISSUE 3: [Team 5] API Endpoints Implementation, Chat Memory & Mocking
*   **Start - End date:** Day 4 - Day 5 (Thứ Năm - Thứ Sáu)
*   **Scope:**
    *   Xây dựng các router API trên FastAPI gồm:
        *   `POST /api/agent/chat` (Hội thoại)
        *   `POST /api/agent/summary` (Tóm tắt sinh hiệu)
        *   `POST /api/agent/explain-alert` (Giải thích cảnh báo)
    *   Triển khai bộ nhớ đàm thoại (**Chat Memory**) tạm thời dạng In-Memory được ánh xạ theo `patient_id` để hỗ trợ bác sĩ hỏi đáp nhiều lượt (multi-turn conversation).
    *   Viết logic sinh dữ liệu **Mock JSON tĩnh** khớp chuẩn Data Contract cho 2 endpoint `summary` và `explain-alert` để bàn giao sớm cho Team 4 Frontend tích hợp vẽ giao diện đồ thị/bảng.
*   **Output:**
    *   3 API endpoints hoạt động hoàn chỉnh với dữ liệu mock.
    *   Chatbot chat có khả năng nhớ ngữ cảnh hội thoại trước đó.
    *   Tài liệu API Swagger hoàn thiện truy cập được qua `/docs`.

---

### ISSUE 4: [Team 5] Database Integration, Dynamic Prompting & Docker Setup
*   **Start - End date:** Day 6 (Thứ Bảy)
*   **Scope:**
    *   Tích hợp thư viện kết nối cơ sở dữ liệu (như SQLAlchemy/asyncpg) để kết nối trực tiếp với Supabase Database của Team 1 người 1.
    *   Lập trình các hàm truy vấn dữ liệu từ bảng `patients`, `clean_vitals` (lịch sử nhịp tim, HRV, huyết áp, SpO2) và `health_alerts` (danh sách cảnh báo).
    *   Viết logic **Dynamic Prompting** (Tự động chèn dữ liệu vừa SELECT từ Database vào các tham số `{vitals_data}`, `{alerts_data}` trong templates prompt).
    *   Viết `Dockerfile` để đóng gói dịch vụ AI Agent (`backend/ai_agent/Dockerfile`).
    *   Hỗ trợ Team 2 viết file orchestrator `docker-compose.yml` tích hợp chạy E2E cho toàn bộ hệ thống ở local.
*   **Output:**
    *   AI Agent đưa ra phản hồi thực tế dựa trên dữ liệu bệnh nhân thực trong Supabase.
    *   Tệp `Dockerfile` cho dịch vụ AI Agent.
    *   Tệp `docker-compose.yml` tổng hợp chạy thử nghiệm E2E toàn nhóm thành công.
