# AI Agent Service

FastAPI service cho Team 5 AI Agent. Service hiện dùng một entrypoint chính:

- `POST /api/agent/chat`

Các endpoint cũ `/api/agent/summary` và `/api/agent/explain-alert` đã bị loại bỏ khỏi primary API. Summary và explain-alert bây giờ là intent bên trong chat router.

Mục tiêu của service là luôn trả về `Contract 6 v1` JSON để frontend render nội dung lâm sàng, chart, hoặc bảng so sánh ổn định.

## Unified Chat Router

`/api/agent/chat` phân loại intent trước khi chạy deterministic tools:

- `patient_summary`: tóm tắt bệnh nhân từ patient context hiện có.
- `explain_alert`: giải thích cảnh báo khi có `alert_id` trong `metadata`.
- `medication_recommendation`: chạy CDSS/rule engine để gợi ý thuốc/nhóm thuốc ở dạng hỗ trợ quyết định cho bác sĩ.
- `vitals_trend`: đọc vitals summary nếu dữ liệu đã được bàn giao.
- `doctor_patient_overview`: hỏi tổng quan toàn bộ bệnh nhân bác sĩ đang theo dõi, xếp hạng theo alert/vitals khi có dữ liệu.
- `patient_lookup`: tìm bệnh nhân theo mã nội viện `P001`, subject ID, tên hiển thị; nếu trùng tên sẽ trả nhiều candidate.
- `general_chat`: hội thoại lâm sàng chung dựa trên patient context.
- `out_of_scope`: chặn câu hỏi ngoài y tế/CDSS và không gọi LLM.

## Request Example

```json
{
  "schema_version": "v1",
  "patient_id": "P001",
  "conversation_id": "CONV_P001_001",
  "doctor_id": "D1",
  "message": "Bệnh nhân rung nhĩ này có thể dùng thuốc chống đông nào?",
  "metadata": {
    "alert_id": "ALT_FALL_0092",
    "time_window_minutes": 60
  }
}
```

`metadata` là optional. Dùng nó để truyền ngữ cảnh UI như `alert_id` hoặc `time_window_minutes` mà không cần nhét mọi thứ vào câu tự nhiên.

Với câu hỏi doctor-scoped như "Hôm nay có bệnh nhân nào nguy hiểm cần theo dõi?" hoặc "Tìm bệnh nhân Nguyễn Văn A", frontend có thể bỏ `patient_id`:

```json
{
  "schema_version": "v1",
  "conversation_id": "CONV_DOCTOR_D1_001",
  "doctor_id": "D1",
  "message": "Tìm bệnh nhân Nguyễn Văn A"
}
```

## Medical Guardrails

Guardrail thuốc hiện cho phép gợi ý CDSS-backed medication cho bác sĩ, nhưng response phải nói rõ đây là clinical decision support, không phải đơn thuốc cuối cùng.

Không được tự tạo:

- liều dùng,
- tần suất,
- thời gian dùng,
- mệnh lệnh điều trị cuối cùng,

nếu deterministic tool/rule không cung cấp.

Bác sĩ phải được nhắc kiểm tra lại:

- chống chỉ định,
- chức năng thận/gan,
- nguy cơ chảy máu,
- thuốc đang dùng và tương tác thuốc,
- guideline fit,
- ngữ cảnh bệnh nhân.

## PostgreSQL Data Availability

Trạng thái database hiện tại là patient-first. PostgreSQL có thể mới có demographics, diagnoses, labs và các trường phục vụ feature extraction.

Các bảng/dòng dữ liệu do team khác bàn giao có thể chưa tồn tại hoặc rỗng:

- `health_alerts`
- `clean_vitals`
- heart-rate/vitals stream
- alert evidence
- wearable sensor context

Vì vậy:

- summary vẫn trả lời dựa trên patient data và nói rõ thiếu recent alerts/vitals;
- medication review vẫn chạy nếu đủ dữ liệu patient/lab/diagnosis để tính feature;
- explain-alert/vitals-trend trả data limitation thay vì crash khi thiếu bảng hoặc thiếu dữ liệu.

## Run Local

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
- `actions`

Với unified chat router, `response_type` primary là `chat`.

`patient_id` có thể là `null` khi response thuộc phạm vi bác sĩ/toàn danh sách. `actions` là optional list cho UI, hiện dùng action:

```json
{
  "type": "select_patient_for_chat",
  "label": "Mo benh nhan nay",
  "patient_id": "10003400",
  "hospital_patient_code": "P001",
  "display_name": "Nguyen Van A"
}
```

## Patient Directory Seed

Tool lookup tên/mã nội viện dùng bảng `patient_directory`. Script seed tạo `P001`-`P100`, tên bệnh nhân tổng hợp và một số nhóm trùng tên để test pipeline phân giải candidate.

Dry-run trước khi upload:

```bash
cd /home/cuong/Desktop/python/VinUni/software-engineering/backend/ai_agent
uv run python scripts/seed_patient_directory.py --dry-run --duplicates
```

Upload vào Postgres:

```bash
uv run python scripts/seed_patient_directory.py --limit 100
```

Biến môi trường cần có một trong hai:

```text
MEMORY_POSTGRES_DSN=postgresql://...
SUPABASE_DB_URL=postgresql://...
```

## Langfuse Tracing

Langfuse is optional and defaults to off. The backend only wraps intent classification, central tool execution, and LLM generation calls.

```text
LANGFUSE_ENABLED=false
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_BASE_URL=https://cloud.langfuse.com
LANGFUSE_CAPTURE_CONTENT=false
LANGFUSE_PATIENT_ID_MODE=hash
LANGFUSE_HASH_SALT=
```

Keep `LANGFUSE_CAPTURE_CONTENT=false` for clinical data. With this default, prompts and model outputs are recorded as length/hash summaries, and patient IDs are hashed unless `LANGFUSE_PATIENT_ID_MODE` is changed.

## Important Modules

| Module | Responsibility |
|---|---|
| `app/workflows/chat_workflow.py` | LangGraph router: classify intent, run tool, generate Contract 6 response |
| `app/observability/langfuse_tracing.py` | Optional no-op-safe Langfuse wrapper |
| `app/services/intent/` | Intent models and classifier |
| `app/tools/clinical/action_context_tools.py` | Summary, alert, medication, and vitals context tools |
| `app/services/clinical/rule_engine.py` | Deterministic YAML rule evaluation |
| `app/services/clinical/drug_safety.py` | Contraindication and DDI filtering |
| `app/services/clinical/retriever.py` | Guideline/evidence retrieval abstraction |
| `app/services/safety/safety_service.py` | Prompt injection and clinical response safety |
| `app/core/container.py` | Dependency injection and tool registration |

## Testing

Targeted checks used during the chat-router change:

```bash
uv run pytest tests/unit/test_intent_classifier.py tests/workflow/test_chat_router.py
uv run pytest tests/unit/test_tools.py tests/unit/test_safety.py tests/workflow/test_agent_service.py tests/integration/test_agent_endpoints.py
```

Full suite:

```bash
uv run pytest
```
