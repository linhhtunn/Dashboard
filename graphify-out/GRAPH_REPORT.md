# Graph Report - software-engineering  (2026-06-05)

## Corpus Check
- 144 files · ~56,332 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1062 nodes · 1696 edges · 113 communities (105 shown, 8 thin omitted)
- Extraction: 67% EXTRACTED · 33% INFERRED · 0% AMBIGUOUS · INFERRED: 558 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6ab0747d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]

## God Nodes (most connected - your core abstractions)
1. `AgentResponse` - 59 edges
2. `AgentService` - 36 edges
3. `ChatRequest` - 34 edges
4. `SummaryRequest` - 33 edges
5. `ExplainAlertRequest` - 33 edges
6. `ResponseType` - 32 edges
7. `ChatMemoryWorkflow` - 29 edges
8. `FakeLLM` - 27 edges
9. `SlidingWindowPolicy` - 25 edges
10. `validate_agent_response()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `AgentResponse` --uses--> `AgentResponse`  [INFERRED]
  backend/ai_agent/app/services/parsers/agent_response_parser.py → backend/ai_agent/app/contracts/agent_response.py
- `AgentResponse` --uses--> `AgentResponse`  [INFERRED]
  backend/ai_agent/app/services/safety/safety_service.py → backend/ai_agent/app/contracts/agent_response.py
- `str` --uses--> `AgentResponse`  [INFERRED]
  backend/ai_agent/app/services/safety/safety_service.py → backend/ai_agent/app/contracts/agent_response.py
- `ChatMessage` --uses--> `ChatMessage`  [INFERRED]
  backend/ai_agent/app/agents/clinical/agent.py → backend/ai_agent/app/api/schemas/agent_requests.py
- `ChatMessage` --uses--> `ChatMessage`  [INFERRED]
  backend/ai_agent/app/agents/clinical/prompts/builders.py → backend/ai_agent/app/api/schemas/agent_requests.py

## Import Cycles
- 1-file cycle: `backend/ai_agent/app/contracts/agent_response.py -> backend/ai_agent/app/contracts/agent_response.py`

## Communities (113 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (49): AgentResponse, AgentService, ChatRequest, ExplainAlertRequest, SummaryRequest, AgentResponse, AgentService, ChatRequest (+41 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (40): Any, bool, Any, str, Any, str, ToolResponse, str (+32 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (33): ChatMemoryState, MemoryTurn, str, ChatMemoryState, str, str, MemoryTurn, str (+25 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (41): AgentServiceT, AsyncOpenAI, str, Settings, float, str, float, LLMResponse (+33 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (45): 1. `patient_id` hoặc `alert_id` không tồn tại, 1. `patient_id` hoặc `alert_id` không tồn tại, 2. LLM trả JSON lỗi hoặc không khớp schema, 2. LLM trả JSON lỗi hoặc không khớp schema, 3. Safety gateway chặn input, 3. Safety gateway chặn input, 4. Clinical safety check fail sau khi parse, 4. Clinical safety check fail sau khi parse (+37 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (33): test_clinical_agent_builds_summary_prompt(), Any, str, Any, str, Any, str, PatientContextTool (+25 more)

### Community 6 - "Community 6"
Cohesion: 0.22
Nodes (12): AgentResponse, str, check_clinical_safety(), classify_prompt_injection(), ClinicalSafetyResult, PromptSafetyResult, test_advisory_clinical_support_response_is_safe(), test_definitive_diagnosis_response_is_unsafe() (+4 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (38): health(), root(), AsyncClient, Any, ChatMessage, str, str, AgentService (+30 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (36): AI Agent Backend Architecture After Refactor, `app/`, `app/agents/`, `app/agents/`, `app/api/`, `app/api/`, `app/contracts/`, `app/contracts/` (+28 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (36): 1. SƠ ĐỒ DÒNG CHẢY DỮ LIỆU TỔNG THỂ (DATA STATE FLOW), 1. Trải nghiệm Sản phẩm (Product Metrics), 2. PHÂN BỔ NHÂN SỰ & VAI TRÒ CHI TIẾT (CẬP NHẬT MỚI), 2. Tiêu chuẩn Kỹ thuật (Technical Metrics), 3. Kịch bản Demo thực tế (Demo Performance), 3. LỘ TRÌNH CHI TIẾT 3 SPRINTS (6 TUẦN), 4. TIÊU CHÍ CHẤT LƯỢNG MÔI TRƯỜNG PRODUCTION (Production Checklist), 5. RỦI RO & PHƯƠNG ÁN XỬ LÝ (Risks & Mitigations) - ĐÃ CẬP NHẬT V3 (+28 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (44): str, Any, str, AgentResponse, str, str, BaseModel, Comparison (+36 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (33): bool, Exception, AgentResponse, str, AgentResponse, Any, str, BaseException (+25 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (25): 1. Nguyen tac tong the, 2. Thu tu su dung de khong bi lan, 3. Lua chon skill theo tinh huong, 4. Prompt mau de kich hoat dung skill, 5. Cach khong dung lan 2 he, 6. Quy uoc team 5, 7. Cheat sheet nhanh, Buoc 1: Mo change bang `openspec` (+17 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (24): 1. `openspec`, 1. Skill chinh de lam viec, 2. Skill nen uu tien theo muc do can thiet, 2. `vibecode-kit`, 3. Cach dung hop ly trong team 5, 3. `security-threat-model`, 4. Cach de LLM khong bi lan, 4. `security-best-practices` (+16 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (22): 1. PHẠM VI GIAO TIẾP GIỮA CÁC TEAMS, 2.1. Đường dẫn tệp Schema dùng chung:, 2.2. Định dạng JSON Payload (Raw Vitals):, 2.3. Quy định đơn vị đo lường (Measurement Units):, 2. CONTRACT 1: BROKER MESSAGE SCHEMA (TEAM 1 → TEAM 2), 3.1. Nhãn Trạng thái Kỹ thuật (Technical Data State) - Do Team 2 gán:, 3.2. Nhãn Trạng thái Sức khỏe (Health Status) - Do Team 3 gán:, 3. CONTRACT 2: PHÂN TÁCH NHÃN TRẠNG THÁI (TEAM 2 & TEAM 3) (+14 more)

### Community 15 - "Community 15"
Cohesion: 0.09
Nodes (21): 10. Never let the model act as a doctor, 11. Make evaluation part of the product, 12. Use reproducible ML/data workflows, 13. Be strict about time, 14. Build for auditability, 15. Security rules are part of the architecture, 16. Testing must match the domain, 17. Preferred implementation shape (+13 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (21): 1. Tổng quan, 2. Fall Detection, 3. Stroke Warning, 4. So sánh Fall Detection và Stroke Warning, 5. Gợi ý dữ liệu đầu vào cho hệ thống AI Health, 6.1. Trạng thái bình thường & Hoạt động thường nhật (Normal Baseline), 6.2. Các Kịch bản Biến cố & Bệnh lý Cấp tính (Abnormal Scenarios), 6. Định nghĩa Chi tiết & Mở rộng các Giá trị Metric theo Trạng thái Sức khỏe (+13 more)

### Community 17 - "Community 17"
Cohesion: 0.25
Nodes (8): 7. LỘ TRÌNH 3 SPRINT, Deliverables Sprint 2, SPRINT 2 — Core MVP: Streaming, Cleaning, Features, Anomaly, Dashboard, Agent, Team 1, Team 2, Team 3, Team 4, Team 5

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (16): 10. Test Coverage, 11. Ranh Gioi Voi Issue Khac, 1. Muc Tieu, 2. So Do Tong The, 3. Module Map, 4.1 Summary, 4.2 Explain-Alert, 4.3 Chat (+8 more)

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (12): 10. Boundary With Other Issues, 1. Muc Tieu Kien Truc, 2. Runtime Flow, 3. Module Map, 4. Contract 6 Response Shape, 5. Prompt Safety Decision, 6. Parse, Validate, Repair, 7. Retry And Fallback Policy (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.15
Nodes (12): 1. Bối cảnh & Bài toán mục tiêu (Pain Point), 2. Sơ đồ phân rã Modules & Nhiệm vụ các Nhóm (Quest Assignment), 3. Công nghệ chủ đạo (Tech Stack), 4. Sắp xếp nhân sự dựa trên năng lực (Resource Allocation), 5. Kế hoạch triển khai sơ bộ (Next Steps), **TEAM 1: DATA SIMULATOR (Quest 1 - Sản xuất dữ liệu)**, **TEAM 2: ALGORITHM & INGESTION (Quest 2 - Verify & Consumer)**, **TEAM 3: ANOMALY DETECTION (Quest 3 - Phân tích & Tìm điểm bất thường)** (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (22): 1. Label consistency, 2. Pattern validity, 3. Separability, 4. Realism against reference, 6.1. Team 1 — Data Simulator / Message Producer, 6.2. Team 2 — Data Ingestion / Cleaning / Feature Pipeline, 6.3. Team 3 — Anomaly Detection / Simulation Validation, 6.4. Team 4 — Doctor-facing Dashboard (+14 more)

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (11): 1. Kỹ năng, kinh nghiệm hiện có:, 2. Kỳ vọng cá nhân:, Dài hạn, Họ và tên: Nguyễn Đức Cường, Kinh nghiệm học tập trong chương trình AI thực chiến:, Kinh nghiệm nghiên cứu và viết Paper:, Kinh nghiệm thực tập tại Viettel High Tech:, Kinh nghiệm với IoT: (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.17
Nodes (11): 1. SƠ ĐỒ KIẾN TRÚC SPRINT 1 (SYSTEM ARCHITECTURE DIAGRAM), 2.1. Tầng 1: Data Simulator (Phụ trách: Team 1), 2.2. Tầng 2: Cloud Transport (Phụ trách thiết lập: Team 1), 2.3. Tầng 3: Ingestion & Storage (Phụ trách: Team 2), 2.4. Tầng 4: Rule-based Anomaly (Phụ trách: Team 3), 2.5. Tầng 5: Frontend Dashboard & API Mocking (Phụ trách: Team 4), 2.6. Tầng 6: AI Agent Service Mock (Phụ trách: Team 5), 2. CHI TIẾT CÁC THÀNH PHẦN KIẾN TRÚC TRONG SPRINT 1 (+3 more)

### Community 24 - "Community 24"
Cohesion: 0.20
Nodes (9): 1. TIÊU CHÍ HOÀN THÀNH SPRINT 1 (DEFINITION OF DONE - DOD), 2.1. TEAM 1: DATA SIMULATOR & BROKER/DB SETUP (2 nhân sự), 2.2. TEAM 2: DATA INGESTION & CLEANING (1 nhân sự), 2.3. TEAM 3: RULE-BASED ANOMALY (1 nhân sự), 2.4. TEAM 4: DOCTOR-FACING DASHBOARD (FRONTEND) (2 nhân sự), 2.5. TEAM 5: AI AGENT & VALIDATION SUPPORT (1 nhân sự - Nguyễn Đức Cường), 2. BẢNG PHÂN CHIA NHIỆM VỤ THEO TỪNG TEAM (6 NGÀY), KẾ HOẠCH PHÂN CHIA NHIỆM VỤ SPRINT 1 (RÚT NGẮN: 6 NGÀY) (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.20
Nodes (9): 10. RỦI RO & PHƯƠNG ÁN XỬ LÝ, 12. DEMO SCRIPT ĐỀ XUẤT, 13. TÓM TẮT ĐỊNH HƯỚNG, 1. KIẾN TRÚC LUỒNG DỮ LIỆU TỔNG THỂ, 2.1. Luồng A — Main Product Pipeline, 2.2. Luồng B — Simulator Validation Pipeline, 2. HAI LUỒNG CÔNG VIỆC CHÍNH, 5. PHÂN BỔ NHÂN SỰ & VAI TRÒ CHI TIẾT (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.20
Nodes (10): 7.1 Label consistency, 7.2 Pattern validity, 7.3 Separability, 7.4 Realism against reference, 7. Thống nhất simulator validation criteria, Blood pressure abnormality scenario, Fall scenario, Hypoglycemia scenario (+2 more)

### Community 27 - "Community 27"
Cohesion: 0.58
Nodes (8): Any, ChatMessage, str, build_chat_prompt(), build_explain_alert_prompt(), build_summary_prompt(), contract_instruction(), _json_context()

### Community 28 - "Community 28"
Cohesion: 0.22
Nodes (8): 1. Khoi Dong App, 2. Goi Health, 3. Goi Summary Voi LLM That, 4. Goi Explain Alert Voi LLM That, 5. Goi Chat Stateless, 6. Swagger, 7. Luu Y, AI Agent Issue 3 Real LLM Smoke Test

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (8): KẾ HOẠCH ISSUE THEO NGÀY - SPRINT 1 (TEAM 1), [Team 1 - Day 1] Nghiên cứu Sinh hiệu, Thiết lập Cloud & Định nghĩa Hợp đồng Dữ liệu (Pydantic Schema), [Team 1 - Day 2] Thiết kế Schema DB trên Supabase & Script Seeding Bệnh nhân, [Team 1 - Day 3] Cấu hình Broker Topology & Xây dựng Cốt lõi Simulator (Normal Stream), [Team 1 - Day 4] Tích hợp Giao thức AMQPS & Cơ chế Bơm Nhiễu Sinh lý Học, [Team 1 - Day 5] Tối ưu hóa Chu kỳ Phát 1 Hz & Cơ chế Tự động Phục hồi Kết nối, [Team 1 - Day 6] Container hóa Docker & Tích hợp Thử nghiệm E2E Toàn Hệ thống, ĐỀ TÀI: E2E SIMULATION FOR AI HEALTH

### Community 30 - "Community 30"
Cohesion: 0.25
Nodes (7): 1. Cài đặt trên Antigravity, 2. Cách chạy Graphify Không dùng API (Offline & Local), 3. Cách Truy vấn & Điều hướng Đồ thị sau khi tạo, Cách A: Tận dụng Ollama với mô hình chạy cục bộ (Khuyên dùng), Cách B: Chế độ AST-Only (Chỉ trích xuất cấu trúc mã nguồn), Cách C: Sử dụng chính phiên thảo luận Antigravity làm LLM trích xuất ngữ nghĩa (Agent-as-LLM), Hướng dẫn Cài đặt & Sử dụng `graphify` trên Google Antigravity (Không dùng API ngoài)

### Community 31 - "Community 31"
Cohesion: 0.25
Nodes (7): 1. Xác định pain point qua 4 lăng kính (Dưới góc nhìn AI Agent), 2. Áp dụng mô hình Kim cương kép (Double Diamond) cho AI Agent, 3. Đặt 5 câu hỏi then chốt (Dành riêng cho AI Agent), 4. Khung 6 ô (Problem Statement) cho AI Agent, BẢN PHÂN TÍCH VÀ THIẾT KẾ AI AGENT & CLINICAL ASSISTANT, Kim cương 1: Tìm đúng vấn đề (Find the Right Problem), Kim cương 2: Tìm giải pháp (Find the Right Solution)

### Community 32 - "Community 32"
Cohesion: 0.29
Nodes (6): ISSUE 1: [Team 5] Setup FastAPI Project, LLM Integration & Prompt Engineering, ISSUE 2: [Team 5] Structured Output Validation & Safety Guardrails, ISSUE 3: [Team 5] API Endpoints Implementation, Chat Memory & Mocking, ISSUE 4: [Team 5] Database Integration, Dynamic Prompting & Docker Setup, PHỤ TRÁCH: NGUYỄN ĐỨC CƯỜNG, TEAM 5 - AI AGENT GITHUB ISSUES (SPRINT 1)

### Community 33 - "Community 33"
Cohesion: 0.33
Nodes (6): 11.1. Product metrics, 11.2. Data pipeline metrics, 11.3. Anomaly metrics, 11.4. Simulation quality metrics, 11.5. Demo performance, 11. SUCCESS METRICS

### Community 34 - "Community 34"
Cohesion: 0.33
Nodes (6): 3. Thống nhất ground-truth metadata, Cách truyền ground truth, Ground-truth metadata mẫu, Khuyến nghị MVP, Mục tiêu, Thiết kế đề xuất

### Community 35 - "Community 35"
Cohesion: 0.33
Nodes (6): 4. Thống nhất RabbitMQ / transport contract, Mục tiêu, Optional cho Team 3 realtime, Queue MVP tối thiểu, Routing keys đề xuất, Thiết kế MVP đề xuất

### Community 36 - "Community 36"
Cohesion: 0.33
Nodes (6): 5. Thống nhất FAULT và ABNORMAL, Mục tiêu, Quy tắc chốt, Team 2 xử lý trạng thái kỹ thuật, Team 3 xử lý trạng thái sức khỏe/anomaly, Ví dụ phân biệt

### Community 37 - "Community 37"
Cohesion: 0.33
Nodes (6): 6. Thống nhất raw, clean và feature output, Ba lớp dữ liệu nên có, Feature cơ bản Team 2 nên tính, Mục tiêu, Team 3 cần thống nhất với Team 2, Ý nghĩa

### Community 38 - "Community 38"
Cohesion: 0.40
Nodes (4): Additional info:, Doctor workflow, Dấu hiệu đột quỵ:, Pain point:

### Community 39 - "Community 39"
Cohesion: 0.40
Nodes (4): 1. Những kỹ năng có, 2. Mong muốn học thêm / Định hướng nghề nghiệp (Career Path), Họ và tên: Nguyễn Trần Khương An, Team: Health App - Backend

### Community 40 - "Community 40"
Cohesion: 0.40
Nodes (4): 1. Những kỹ năng có, 2. Mong muốn học thêm / Định hướng nghề nghiệp (Career Path), Họ và tên: Nguyễn Bằng Anh, Team: Health App - Backend

### Community 41 - "Community 41"
Cohesion: 0.40
Nodes (4): Background & Interests, Họ và tên: Nguyễn Phương Linh, Long-term Career Direction, Skills & Areas Willing to Learn Further

### Community 42 - "Community 42"
Cohesion: 0.40
Nodes (4): 1. Các kĩ năng, kinh nghiệm đã có:, 2. Kỳ vọng cá nhân:, Họ và tên: Nguyễn Anh Hào, Team: Health App - Backend

### Community 43 - "Community 43"
Cohesion: 0.40
Nodes (4): Background & Interests, Họ và tên: Nguyễn Trọng Thiên Khôi, Long-term Career Direction, Skills & Areas Willing to Learn Further

### Community 44 - "Community 44"
Cohesion: 0.40
Nodes (5): 8.1. Normal scenario, 8.2. Fall scenario, 8.3. Hypoglycemia scenario, 8.4. BP abnormal scenario, 8. TIÊU CHÍ KIỂM CHỨNG CHẤT LƯỢNG SIMULATOR

### Community 45 - "Community 45"
Cohesion: 0.22
Nodes (8): 10. Checklist cần chốt trong buổi họp Team 1–2–3, 11. Tóm tắt ngắn gọn, 9. Phân vai theo data contract, Data Contract giữa Team 1, Team 2, Team 3, Mục đích, Team 1 — Data Simulator / Message Producer, Team 2 — Data Ingestion / Cleaning / Feature Pipeline, Team 3 — Anomaly Detection / Simulation Validation

### Community 46 - "Community 46"
Cohesion: 0.40
Nodes (5): 2. Thống nhất raw message schema, Cần thống nhất rõ, Mục tiêu, Raw vitals payload đề xuất, Đơn vị đo đề xuất

### Community 47 - "Community 47"
Cohesion: 0.40
Nodes (5): 8. Thống nhất alert schema, Alert schema đề xuất, Alert types đề xuất, Mục tiêu, Severity đề xuất

### Community 48 - "Community 48"
Cohesion: 0.50
Nodes (3): 1. Raw / Primary Signals, 2. Engineered / Derived Features, Wearable Health Monitoring Features for Fall & Stroke Detection

### Community 49 - "Community 49"
Cohesion: 0.50
Nodes (3): 1. Những kỹ năng có, 2. Định hướng nghề nghiệp (Career Path), Họ và tên: Nguyễn Thi Thu Hiền

### Community 50 - "Community 50"
Cohesion: 0.50
Nodes (4): 3.1. Data state — Team 2 phụ trách, 3.2. Health status — Team 3 phụ trách, 3.3. Ground truth — Team 1 cung cấp cho evaluation, 3. PHÂN BIỆT CÁC LOẠI TRẠNG THÁI

### Community 51 - "Community 51"
Cohesion: 0.50
Nodes (4): 4.1. Vitals stream payload, 4.2. Ground-truth metadata, 4.3. RabbitMQ / CloudAMQP design, 4. THIẾT KẾ MESSAGE CONTRACT GIỮA TEAM 1, 2, 3

### Community 52 - "Community 52"
Cohesion: 0.50
Nodes (4): 1. Thống nhất use case và scenario, Ai dùng phần này?, Mỗi scenario cần thống nhất, Mục tiêu

### Community 53 - "Community 53"
Cohesion: 0.18
Nodes (10): Check for context, Ending Discovery, Guardrails, Handling Different Entry Points, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do (+2 more)

### Community 56 - "Community 56"
Cohesion: 0.67
Nodes (3): AI Health Monitoring MVP with Simulated Wearable Data, E2E SIMULATION FOR AI HEALTH, KẾ HOẠCH TRIỂN KHAI CHI TIẾT DỰ ÁN

### Community 66 - "Community 66"
Cohesion: 0.20
Nodes (9): Check for context, Ending Discovery, Guardrails, OpenSpec Awareness, The Stance, What You Don't Have To Do, What You Might Do, When a change exists (+1 more)

### Community 104 - "Community 104"
Cohesion: 0.29
Nodes (7): Deliverables Sprint 1, SPRINT 1 — Foundation, Dataset Reference, Message Contract & Skeleton, Team 1, Team 2, Team 3, Team 4, Team 5

### Community 105 - "Community 105"
Cohesion: 0.29
Nodes (7): Deliverables Sprint 3, SPRINT 3 — E2E Integration, Evaluation, Quality Report, Polish, Team 1, Team 2, Team 3, Team 4, Team 5

## Knowledge Gaps
- **433 isolated node(s):** `bool`, `Any`, `str`, `str`, `str` (+428 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AgentResponse` connect `Community 0` to `Community 2`, `Community 6`, `Community 7`, `Community 10`, `Community 11`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `LLMOutputParseError` connect `Community 11` to `Community 0`, `Community 1`, `Community 7`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `FixturePatientRepository` connect `Community 5` to `Community 3`, `Community 7`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Are the 54 inferred relationships involving `AgentResponse` (e.g. with `AgentResponse` and `AgentService`) actually correct?**
  _`AgentResponse` has 54 INFERRED edges - model-reasoned connections that need verification._
- **Are the 29 inferred relationships involving `AgentService` (e.g. with `AsyncClient` and `AgentResponse`) actually correct?**
  _`AgentService` has 29 INFERRED edges - model-reasoned connections that need verification._
- **Are the 32 inferred relationships involving `ChatRequest` (e.g. with `AgentResponse` and `AgentService`) actually correct?**
  _`ChatRequest` has 32 INFERRED edges - model-reasoned connections that need verification._
- **Are the 32 inferred relationships involving `SummaryRequest` (e.g. with `AgentResponse` and `AgentService`) actually correct?**
  _`SummaryRequest` has 32 INFERRED edges - model-reasoned connections that need verification._