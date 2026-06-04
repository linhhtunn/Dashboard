# AI Agent Service

FastAPI service cho Team 5 AI Agent. Service này hiện cung cấp 3 endpoint cho Doctor Dashboard:

- `POST /api/agent/chat`
- `POST /api/agent/summary`
- `POST /api/agent/explain-alert`

Mục tiêu của service là luôn trả về `Contract 6 v1` JSON để frontend có thể render nội dung lâm sàng, chart, hoặc bảng so sánh một cách ổn định.

## Chạy local

```bash
cd /home/cuong/Desktop/python/VinUni/software-engineering/backend/ai_agent
uv run uvicorn app.main:app --reload --port 8005
```

Health check:

```bash
curl http://127.0.0.1:8005/health
```

Swagger:

```text
http://127.0.0.1:8005/docs
```

## Khi nào gọi LLM thật

Nếu process đang chạy có `OPENAI_API_KEY` trong `.env`, các endpoint Agent sẽ đi vào pipeline thật:

`fixture -> prompt -> OpenAI -> parse -> validate -> safety -> fallback`

Nếu thiếu key hoặc LLM trả output lỗi, service sẽ trả typed fallback hợp lệ theo Contract 6 thay vì raw exception.

## Contract 6 Response

Mọi response thành công hoặc fallback đều có cấu trúc chung:

- `schema_version`
- `response_type`
- `patient_id`
- `source_id`
- `generated_at`
- `narrative_summary`
- `visualizations`
- `comparisons`

Frontend nên luôn đọc 2 nhánh:

- `visualizations.has_chart` và `visualizations.data_points`
- `comparisons.has_comparison` và `comparisons.rows`

### Response Contract Example

Response thực tế từ service hiện có shape như sau và frontend có thể parse trực tiếp:

```json
{
  "schema_version": "v1",
  "response_type": "summary",
  "patient_id": "P001",
  "source_id": "P001",
  "generated_at": "2026-06-02T07:10:05.054853Z",
  "narrative_summary": "### Tom tat sinh hieu gan day\n- **Benh nhan:** Nguyen Van A, 72 tuoi, Nam.\n- **Tien su:** Tang huyet ap; co tien su nga nhe trong thang gan day.\n\n### Chi so noi bat\n- **10:04:55Z:** Sinh hieu o muc on dinh: HR **78 bpm**, HRV **42 ms**, HA **128/82 mmHg**, SpO2 **98%**, trang thai **standing**.\n- **10:05:00Z:** Xuat hien bien dong bat thuong: HR tang len **112 bpm**, HRV giam con **31 ms**, HA **136/86 mmHg**, SpO2 **97%**, trang thai **impact_detected** va duoc danh dau **ABNORMAL**.\n- **10:05:05Z:** Sau do HR giam ve **95 bpm**, HRV **35 ms**, HA **132/84 mmHg**, SpO2 **97%**, trang thai **low_movement**, duoc danh dau **WARNING**.\n\n### Danh gia bang chung\n- Lich su canh bao gan day co **fall_detected** voi **severity: HIGH**, **confidence: 0.94** va thong diep: *\"Phat hien cu nga dot ngot kem bat dong ngan sau va cham.\"*\n- Ket hop giua **impact_detected**, sau do **low_movement**, cung voi canh bao nga co do tin cay cao, lam tang muc do nghi ngo co su kien nga gan thoi diem do.\n- Huyet ap hien tai o muc **128-136/82-86 mmHg**, chua thay bat thuong ro rang trong du lieu cung cap; SpO2 duy tri **97-98%**.\n\n### Gioi han du lieu\n- Du lieu chi bao gom **3 moc thoi gian gan nhau**, khong co chuoi theo doi dai hon de danh gia xu huong ben vung.\n- Khong co du lieu chi tiet ve **acc_x/acc_y/acc_z** va **gyro_x/gyro_y/gyro_z**, nen khong the doi chieu sau hon ve co che va muc do va cham.\n- Khong the ket luan chan doan xac dinh; can bac si kiem tra truc tiep benh nhan neu co dau hieu nga, dau, choang, yeu chi, hoac thay doi y thuc.",
  "visualizations": {
    "has_chart": true,
    "chart_type": "time-series",
    "chart_title": "Heart rate va trang thai su kien gan thoi diem nghi nga",
    "data_points": [
      {
        "timestamp": "2026-05-28T10:04:55Z",
        "metric": "heart_rate",
        "value": 78,
        "unit": "bpm",
        "status": "NORMAL"
      },
      {
        "timestamp": "2026-05-28T10:05:00Z",
        "metric": "heart_rate",
        "value": 112,
        "unit": "bpm",
        "status": "ABNORMAL"
      },
      {
        "timestamp": "2026-05-28T10:05:05Z",
        "metric": "heart_rate",
        "value": 95,
        "unit": "bpm",
        "status": "WARNING"
      }
    ]
  },
  "comparisons": {
    "has_comparison": true,
    "comparison_type": "vitals-vs-activity",
    "headers": ["Chi so", "Gia tri", "Trang thai", "Bang chung"],
    "rows": [
      ["Heart rate", "78 -> 112 -> 95 bpm", "NORMAL -> ABNORMAL -> WARNING", "Tang dot ngot tai 10:05:00Z, sau do giam nhe"],
      ["HRV", "42 -> 31 -> 35 ms", "Giam", "Giam trong luc co impact_detected"],
      ["Huyet ap", "128/82 -> 136/86 -> 132/84 mmHg", "On dinh tuong doi", "Khong co bat thuong ro rang trong mau ngan"],
      ["SpO2", "98 -> 97 -> 97%", "On dinh", "Khong ghi nhan giam oxy mau"],
      ["Hoat dong", "standing -> impact_detected -> low_movement", "Bat thuong", "Co dau hieu su kien vat ly gan thoi diem canh bao"]
    ]
  }
}
```

Front end nên coi đây là contract parse được trực tiếp, không cần đọc raw LLM text.

## Endpoint Guide

### `POST /api/agent/summary`

Input:

```json
{
  "patient_id": "P001"
}
```

Behavior:

- Resolve mock patient fixture theo `patient_id`
- Build prompt summary từ vitals, alert gần đây, và medical history
- Gọi LLM thật nếu có key
- Trả `response_type = "summary"`
- `source_id` luôn bằng `patient_id`

Frontend kỳ vọng:

- `narrative_summary` tóm tắt tình trạng gần đây
- `visualizations` thường có chart time-series
- `comparisons` có thể không bật nếu không cần bảng so sánh

### `POST /api/agent/explain-alert`

Input:

```json
{
  "alert_id": "ALT_FALL_0092"
}
```

Behavior:

- Resolve mock alert fixture theo `alert_id`
- Lấy thêm patient context để giải thích cảnh báo
- Gọi LLM thật nếu có key
- Trả `response_type = "explain-alert"`
- `source_id` luôn bằng `alert_id`

Frontend kỳ vọng:

- `narrative_summary` giải thích vì sao alert xảy ra
- `visualizations` thường có dữ liệu quanh thời điểm cảnh báo
- `comparisons` thường là bảng evidence/diễn giải

Sample response shape:

```json
{
  "schema_version": "v1",
  "response_type": "explain-alert",
  "patient_id": "P001",
  "source_id": "ALT_FALL_0092",
  "generated_at": "2026-06-02T07:10:05.054853Z",
  "narrative_summary": "### Giai thich canh bao tam thoi\n- Alert `fall_detected` xuat hien tai `10:05:03Z`.\n- Bang chung chinh la `peak_acceleration`, `post_event_movement_level` va `event_window_seconds`.\n- Day la phan tich ho tro; bac si can kiem tra truc tiep benh nhan.",
  "visualizations": {
    "has_chart": true,
    "chart_type": "time-series",
    "chart_title": "Heart rate quanh thoi diem canh bao",
    "data_points": [
      {
        "timestamp": "2026-05-28T10:04:55Z",
        "metric": "heart_rate",
        "value": 78,
        "unit": "bpm",
        "status": "NORMAL"
      }
    ]
  },
  "comparisons": {
    "has_comparison": true,
    "comparison_type": "alert-evidence",
    "headers": ["Tin hieu", "Gia tri", "Nguong/Chuan tham chieu", "Dien giai"],
    "rows": [
      ["Gia toc dinh", "4.8g", "Tang dot ngot so voi van dong binh thuong", "Phu hop voi va cham manh"]
    ]
  }
}
```

### `POST /api/agent/chat`

Input:

```json
{
  "schema_version": "v1",
  "patient_id": "P001",
  "conversation_id": "CONV_P001_001",
  "message": "Nhip tim va SpO2 gan canh bao co gi dang chu y khong?",
  "history": [
    { "role": "user", "content": "Xin chao" },
    { "role": "assistant", "content": "Toi co the giup gi?" }
  ]
}
```

Behavior:

- `history` là optional
- `chat` hiện tại là stateless, chưa có server-side memory
- `conversation_id` nếu có thì sẽ được dùng làm `source_id`
- Nếu input bị safety gateway chặn, service trả fallback an toàn ngay

Frontend kỳ vọng:

- Response vẫn theo Contract 6
- Có thể không có chart nếu câu hỏi là text-only
- Nếu `has_chart = false`, frontend nên ẩn hoặc bỏ qua chart area

Sample response shape:

```json
{
  "schema_version": "v1",
  "response_type": "chat",
  "patient_id": "P001",
  "source_id": "CONV_P001_001",
  "generated_at": "2026-06-02T07:10:05.054853Z",
  "narrative_summary": "### Tra loi ho tro\n- Nhip tim va SpO2 hien tai can duoc so sanh voi mau gan nhat.\n- Du lieu cho thay co mot doan tang nhip tim tai moc canh bao.\n- Bac si nen doi chieu them voi van dong va alert gan day.",
  "visualizations": {
    "has_chart": false,
    "chart_type": "time-series",
    "chart_title": "",
    "data_points": []
  },
  "comparisons": {
    "has_comparison": false,
    "comparison_type": "vitals-trend",
    "headers": [],
    "rows": []
  }
}
```

## Các trường hợp quan trọng

### 1. `patient_id` hoặc `alert_id` không tồn tại

Service sẽ trả typed fallback hợp lệ thay vì raw error.

### 2. LLM trả JSON lỗi hoặc không khớp schema

Service sẽ retry ở mức bounded repair retry. Nếu vẫn fail, frontend vẫn nhận được Contract 6 fallback.

### 3. Safety gateway chặn input

Ví dụ input cố tình:

- ghi đè system prompt
- yêu cầu lộ secret
- phá format JSON/schema

Service sẽ trả fallback an toàn và không gọi LLM cho case BLOCK.

### 4. Clinical safety check fail sau khi parse

Nếu response có chẩn đoán chắc chắn hoặc kê đơn/liều thuốc, service sẽ fallback thay vì trả nội dung đó cho frontend.

## Field Mapping Cho Frontend

### `source_id`

- `summary` -> `patient_id`
- `explain-alert` -> `alert_id`
- `chat` -> `conversation_id` nếu có, ngược lại `patient_id`

### `visualizations`

- `has_chart = true` -> dùng `data_points` để vẽ chart
- `has_chart = false` -> không cần render chart

### `comparisons`

- `has_comparison = true` -> dùng `headers` và `rows` để render bảng
- `has_comparison = false` -> không cần render table

## Gợi ý tích hợp frontend

- Luôn kiểm tra HTTP status trước khi render.
- Nếu response là fallback, vẫn render bình thường nhưng hiển thị như một response an toàn, không xem là lỗi UI.
- Không phụ thuộc vào raw LLM text.
- Chỉ dùng các field Contract 6.

## Smoke Test Real LLM

Nếu muốn kiểm tra LLM thật, xem file:

[ai_agent_issue_3_llm_smoke_test.md](</home/cuong/Desktop/python/VinUni/software-engineering/docs/members/backend/Cuong_Nguyen/ai_agent_issue_3_llm_smoke_test.md>)

## Tóm tắt ngắn

Frontend chỉ cần nhớ 1 điều:

`summary` và `explain-alert` đều trả về Contract 6 JSON có thể dùng để vẽ dashboard, còn `chat` là endpoint hội thoại stateless ở Sprint 1.

---
title: Health App AI Agent
emoji: 🩺
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# AI Agent Service

FastAPI service cho Team 5 AI Agent. Service này hiện cung cấp 3 endpoint cho Doctor Dashboard:

- `POST /api/agent/chat`
- `POST /api/agent/summary`
- `POST /api/agent/explain-alert`

Mục tiêu của service là luôn trả về `Contract 6 v1` JSON để frontend có thể render nội dung lâm sàng, chart, hoặc bảng so sánh một cách ổn định.

## Chạy local

```bash
cd /home/cuong/Desktop/python/VinUni/software-engineering/backend/ai_agent
uv run uvicorn app.main:app --reload --port 8005
```

Health check:

```bash
curl http://127.0.0.1:8005/health
```

Swagger:

```text
http://127.0.0.1:8005/docs
```

## Khi nào gọi LLM thật

Nếu process đang chạy có `OPENAI_API_KEY` trong `.env`, các endpoint Agent sẽ đi vào pipeline thật:

`fixture -> prompt -> OpenAI -> parse -> validate -> safety -> fallback`

Nếu thiếu key hoặc LLM trả output lỗi, service sẽ trả typed fallback hợp lệ theo Contract 6 thay vì raw exception.

## Contract 6 Response

Mọi response thành công hoặc fallback đều có cấu trúc chung:

- `schema_version`
- `response_type`
- `patient_id`
- `source_id`
- `generated_at`
- `narrative_summary`
- `visualizations`
- `comparisons`

Frontend nên luôn đọc 2 nhánh:

- `visualizations.has_chart` và `visualizations.data_points`
- `comparisons.has_comparison` và `comparisons.rows`

### Response Contract Example

Response thực tế từ service hiện có shape như sau và frontend có thể parse trực tiếp:

```json
{
  "schema_version": "v1",
  "response_type": "summary",
  "patient_id": "P001",
  "source_id": "P001",
  "generated_at": "2026-06-02T07:10:05.054853Z",
  "narrative_summary": "### Tom tat sinh hieu gan day\n- **Benh nhan:** Nguyen Van A, 72 tuoi, Nam.\n- **Tien su:** Tang huyet ap; co tien su nga nhe trong thang gan day.\n\n### Chi so noi bat\n- **10:04:55Z:** Sinh hieu o muc on dinh: HR **78 bpm**, HRV **42 ms**, HA **128/82 mmHg**, SpO2 **98%**, trang thai **standing**.\n- **10:05:00Z:** Xuat hien bien dong bat thuong: HR tang len **112 bpm**, HRV giam con **31 ms**, HA **136/86 mmHg**, SpO2 **97%**, trang thai **impact_detected** va duoc danh dau **ABNORMAL**.\n- **10:05:05Z:** Sau do HR giam ve **95 bpm**, HRV **35 ms**, HA **132/84 mmHg**, SpO2 **97%**, trang thai **low_movement**, duoc danh dau **WARNING**.\n\n### Danh gia bang chung\n- Lich su canh bao gan day co **fall_detected** voi **severity: HIGH**, **confidence: 0.94** va thong diep: *\"Phat hien cu nga dot ngot kem bat dong ngan sau va cham.\"*\n- Ket hop giua **impact_detected**, sau do **low_movement**, cung voi canh bao nga co do tin cay cao, lam tang muc do nghi ngo co su kien nga gan thoi diem do.\n- Huyet ap hien tai o muc **128-136/82-86 mmHg**, chua thay bat thuong ro rang trong du lieu cung cap; SpO2 duy tri **97-98%**.\n\n### Gioi han du lieu\n- Du lieu chi bao gom **3 moc thoi gian gan nhau**, khong co chuoi theo doi dai hon de danh gia xu huong ben vung.\n- Khong co du lieu chi tiet ve **acc_x/acc_y/acc_z** va **gyro_x/gyro_y/gyro_z**, nen khong the doi chieu sau hon ve co che va muc do va cham.\n- Khong the ket luan chan doan xac dinh; can bac si kiem tra truc tiep benh nhan neu co dau hieu nga, dau, choang, yeu chi, hoac thay doi y thuc.",
  "visualizations": {
    "has_chart": true,
    "chart_type": "time-series",
    "chart_title": "Heart rate va trang thai su kien gan thoi diem nghi nga",
    "data_points": [
      {
        "timestamp": "2026-05-28T10:04:55Z",
        "metric": "heart_rate",
        "value": 78,
        "unit": "bpm",
        "status": "NORMAL"
      },
      {
        "timestamp": "2026-05-28T10:05:00Z",
        "metric": "heart_rate",
        "value": 112,
        "unit": "bpm",
        "status": "ABNORMAL"
      },
      {
        "timestamp": "2026-05-28T10:05:05Z",
        "metric": "heart_rate",
        "value": 95,
        "unit": "bpm",
        "status": "WARNING"
      }
    ]
  },
  "comparisons": {
    "has_comparison": true,
    "comparison_type": "vitals-vs-activity",
    "headers": ["Chi so", "Gia tri", "Trang thai", "Bang chung"],
    "rows": [
      ["Heart rate", "78 -> 112 -> 95 bpm", "NORMAL -> ABNORMAL -> WARNING", "Tang dot ngot tai 10:05:00Z, sau do giam nhe"],
      ["HRV", "42 -> 31 -> 35 ms", "Giam", "Giam trong luc co impact_detected"],
      ["Huyet ap", "128/82 -> 136/86 -> 132/84 mmHg", "On dinh tuong doi", "Khong co bat thuong ro rang trong mau ngan"],
      ["SpO2", "98 -> 97 -> 97%", "On dinh", "Khong ghi nhan giam oxy mau"],
      ["Hoat dong", "standing -> impact_detected -> low_movement", "Bat thuong", "Co dau hieu su kien vat ly gan thoi diem canh bao"]
    ]
  }
}
```

Front end nên coi đây là contract parse được trực tiếp, không cần đọc raw LLM text.

## Endpoint Guide

### `POST /api/agent/summary`

Input:

```json
{
  "patient_id": "P001"
}
```

Behavior:

- Resolve mock patient fixture theo `patient_id`
- Build prompt summary từ vitals, alert gần đây, và medical history
- Gọi LLM thật nếu có key
- Trả `response_type = "summary"`
- `source_id` luôn bằng `patient_id`

Frontend kỳ vọng:

- `narrative_summary` tóm tắt tình trạng gần đây
- `visualizations` thường có chart time-series
- `comparisons` có thể không bật nếu không cần bảng so sánh

### `POST /api/agent/explain-alert`

Input:

```json
{
  "alert_id": "ALT_FALL_0092"
}
```

Behavior:

- Resolve mock alert fixture theo `alert_id`
- Lấy thêm patient context để giải thích cảnh báo
- Gọi LLM thật nếu có key
- Trả `response_type = "explain-alert"`
- `source_id` luôn bằng `alert_id`

Frontend kỳ vọng:

- `narrative_summary` giải thích vì sao alert xảy ra
- `visualizations` thường có dữ liệu quanh thời điểm cảnh báo
- `comparisons` thường là bảng evidence/diễn giải

Sample response shape:

```json
{
  "schema_version": "v1",
  "response_type": "explain-alert",
  "patient_id": "P001",
  "source_id": "ALT_FALL_0092",
  "generated_at": "2026-06-02T07:10:05.054853Z",
  "narrative_summary": "### Giai thich canh bao tam thoi\n- Alert `fall_detected` xuat hien tai `10:05:03Z`.\n- Bang chung chinh la `peak_acceleration`, `post_event_movement_level` va `event_window_seconds`.\n- Day la phan tich ho tro; bac si can kiem tra truc tiep benh nhan.",
  "visualizations": {
    "has_chart": true,
    "chart_type": "time-series",
    "chart_title": "Heart rate quanh thoi diem canh bao",
    "data_points": [
      {
        "timestamp": "2026-05-28T10:04:55Z",
        "metric": "heart_rate",
        "value": 78,
        "unit": "bpm",
        "status": "NORMAL"
      }
    ]
  },
  "comparisons": {
    "has_comparison": true,
    "comparison_type": "alert-evidence",
    "headers": ["Tin hieu", "Gia tri", "Nguong/Chuan tham chieu", "Dien giai"],
    "rows": [
      ["Gia toc dinh", "4.8g", "Tang dot ngot so voi van dong binh thuong", "Phu hop voi va cham manh"]
    ]
  }
}
```

### `POST /api/agent/chat`

Input:

```json
{
  "schema_version": "v1",
  "patient_id": "P001",
  "conversation_id": "CONV_P001_001",
  "message": "Nhip tim va SpO2 gan canh bao co gi dang chu y khong?",
  "history": [
    { "role": "user", "content": "Xin chao" },
    { "role": "assistant", "content": "Toi co the giup gi?" }
  ]
}
```

Behavior:

- `history` là optional
- `chat` có short-term memory phía server khi gửi `conversation_id`
- `conversation_id` được dùng làm `source_id` và LangGraph `thread_id`
- cùng một `conversation_id` sẽ resume conversation state đã checkpoint
- Nếu input bị safety gateway chặn, service trả fallback an toàn ngay

Frontend kỳ vọng:

- Response vẫn theo Contract 6
- Có thể không có chart nếu câu hỏi là text-only
- Nếu `has_chart = false`, frontend nên ẩn hoặc bỏ qua chart area

Sample response shape:

```json
{
  "schema_version": "v1",
  "response_type": "chat",
  "patient_id": "P001",
  "source_id": "CONV_P001_001",
  "generated_at": "2026-06-02T07:10:05.054853Z",
  "narrative_summary": "### Tra loi ho tro\n- Nhip tim va SpO2 hien tai can duoc so sanh voi mau gan nhat.\n- Du lieu cho thay co mot doan tang nhip tim tai moc canh bao.\n- Bac si nen doi chieu them voi van dong va alert gan day.",
  "visualizations": {
    "has_chart": false,
    "chart_type": "time-series",
    "chart_title": "",
    "data_points": []
  },
  "comparisons": {
    "has_comparison": false,
    "comparison_type": "vitals-trend",
    "headers": [],
    "rows": []
  }
}
```

## Các trường hợp quan trọng

### 1. `patient_id` hoặc `alert_id` không tồn tại

Service sẽ trả typed fallback hợp lệ thay vì raw error.

### 2. LLM trả JSON lỗi hoặc không khớp schema

Service sẽ retry ở mức bounded repair retry. Nếu vẫn fail, frontend vẫn nhận được Contract 6 fallback.

### 3. Safety gateway chặn input

Ví dụ input cố tình:

- ghi đè system prompt
- yêu cầu lộ secret
- phá format JSON/schema

Service sẽ trả fallback an toàn và không gọi LLM cho case BLOCK.

### 4. Clinical safety check fail sau khi parse

Nếu response có chẩn đoán chắc chắn hoặc kê đơn/liều thuốc, service sẽ fallback thay vì trả nội dung đó cho frontend.

### 5. Chat memory fallback

Nếu chat response lỗi parse/schema/safety hoặc phải fallback, service không ghi assistant output lỗi vào short-term memory. Điều này giúp lần chat sau không bị kéo theo nội dung lỗi.

## Short-Term Memory

`/api/agent/chat` dùng LangGraph short-term memory theo `conversation_id`.

Memory context khi build prompt gồm:

- patient context
- conversation summary
- recent raw turns
- current user message

Policy hiện tại:

```text
compact_turn_threshold = 6
overlap_turns = 2
```

Khi raw turns vượt ngưỡng, service compact phần cũ vào summary và giữ lại 2 turn gần nhất dạng raw để không mất mạch hội thoại:

```text
summary = old summary + compacted older turns
raw_turns = latest 2 turns
```

`summary` và `explain-alert` vẫn stateless, không đọc hoặc ghi chat memory.

## Supabase / Postgres Memory Setup

Local/test mặc định dùng:

```env
MEMORY_CHECKPOINTER=memory
```

Để dùng Supabase/Postgres:

```env
MEMORY_CHECKPOINTER=supabase
SUPABASE_DB_URL=postgresql://USER:PASSWORD@HOST:PORT/postgres?sslmode=require
```

Hoặc dùng:

```env
MEMORY_POSTGRES_DSN=postgresql://USER:PASSWORD@HOST:PORT/postgres?sslmode=require
```

SQL script tạo bảng checkpoint:

[create_supabase_langgraph_checkpoints.sql](/home/cuong/Desktop/python/VinUni/software-engineering/backend/ai_agent/scripts/create_supabase_langgraph_checkpoints.sql)

## Field Mapping Cho Frontend

### `source_id`

- `summary` -> `patient_id`
- `explain-alert` -> `alert_id`
- `chat` -> `conversation_id` nếu có, ngược lại `patient_id`

### `visualizations`

- `has_chart = true` -> dùng `data_points` để vẽ chart
- `has_chart = false` -> không cần render chart

### `comparisons`

- `has_comparison = true` -> dùng `headers` và `rows` để render bảng
- `has_comparison = false` -> không cần render table

## Gợi ý tích hợp frontend

- Luôn kiểm tra HTTP status trước khi render.
- Nếu response là fallback, vẫn render bình thường nhưng hiển thị như một response an toàn, không xem là lỗi UI.
- Không phụ thuộc vào raw LLM text.
- Chỉ dùng các field Contract 6.

## Smoke Test Real LLM

Nếu muốn kiểm tra LLM thật, xem file:

[ai_agent_issue_3_llm_smoke_test.md](</home/cuong/Desktop/python/VinUni/software-engineering/docs/members/backend/Cuong_Nguyen/ai_agent_issue_3_llm_smoke_test.md>)

## Tóm tắt ngắn

Frontend chỉ cần nhớ 1 điều:

`summary` và `explain-alert` đều trả về Contract 6 JSON có thể dùng để vẽ dashboard, còn `chat` có short-term memory theo `conversation_id`.
