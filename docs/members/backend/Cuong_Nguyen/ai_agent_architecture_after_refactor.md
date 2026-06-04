# AI Agent Backend Architecture After Refactor

Tài liệu này mô tả kiến trúc hiện tại của `backend/ai_agent` sau các phase refactor. Mục tiêu là giúp developer biết thư mục nào dùng để làm gì, file nào chịu trách nhiệm gì, và khi thêm feature mới thì nên đặt code ở đâu.

Trạng thái hiện tại: refactor kiến trúc chính đã hoàn thành ở mức backend MVP hiện tại. Các file facade lẻ cũ ở `app/` như `schemas.py`, `output_parser.py`, `llm_client.py`, `safety.py`, `fallback.py`, `prompts.py`, `retry.py`, `logging_config.py` đã được bỏ hoặc chuyển vào đúng package.

## Part 1. Nguyên Tắc Kiến Trúc

Luồng dependency chính:

```text
api / routers
  -> services / workflows
  -> agents
  -> tools / services
  -> repositories / infrastructure
```

Các rule quan trọng:

- API chỉ nhận request, validate schema, gọi service. API không chứa AI logic.
- Agent chỉ build prompt và reasoning-facing behavior. Agent không truy cập database.
- Workflow chịu trách nhiệm orchestration từng use case.
- Repository chỉ làm persistence/data access.
- Tool là boundary reusable giữa nhiều agent/workflow.
- LLM provider nằm sau port, không gọi OpenAI trực tiếp từ workflow hoặc agent.
- Memory tách riêng khỏi business logic, gồm short-term memory, checkpointer, summarizer.
- Cross-cutting concern như logging và retry nằm trong `infrastructure`.

## Part 2. Cấu Trúc Thư Mục Cấp Cao

```text
backend/ai_agent/
├── app/
│   ├── agents/
│   ├── api/
│   ├── contracts/
│   ├── core/
│   ├── fixtures/
│   ├── infrastructure/
│   ├── memory/
│   ├── repositories/
│   ├── routers/
│   ├── services/
│   ├── tools/
│   ├── workflows/
│   ├── __init__.py
│   ├── config.py
│   └── main.py
├── scripts/
├── tests/
├── Dockerfile
├── README.md
├── pytest.ini
└── requirements.txt
```

## Part 3. Giải Thích Từng Thư Mục

### `app/`

Package runtime chính của AI Agent backend. Chỉ còn các entrypoint/config ở root. Business module đã được chia vào các package con.

### `app/api/`

Chứa schema request/response thuộc tầng API. Tầng này không chứa business logic, AI logic, workflow orchestration, hoặc data access.

### `app/routers/`

Chứa FastAPI router. Router nhận HTTP request, inject service, gọi service method, trả response.

### `app/contracts/`

Chứa contract dữ liệu dùng giữa backend, LLM output, tool output và frontend. Đây là các schema/DTO ổn định hơn API request schema.

### `app/agents/`

Chứa agent theo domain. Agent không truy cập database, không gọi external API, không orchestration workflow. Agent hiện tại chủ yếu build prompt cho clinical assistant.

### `app/workflows/`

Chứa orchestration theo use case. Ví dụ summary, explain alert, chat. Workflow điều phối repository, agent, generation service, memory workflow, safety/fallback.

### `app/services/`

Chứa domain/application service. Đây là nơi đặt logic ứng dụng dùng lại giữa workflow, ví dụ generation, safety, fallback, parser, prompt builder.

### `app/repositories/`

Chứa persistence boundary. `ports/` là interface/protocol. `fixtures/` là implementation hiện tại bằng mock fixture. Sau này có thể thêm `postgres/` mà không đổi workflow.

### `app/tools/`

Chứa tool platform reusable. Tool có contract, registry và implementation theo domain. Tool không viết riêng bên trong agent.

### `app/memory/`

Chứa state management cho conversation memory. Tách short-term memory, summarizer và checkpointer để không trộn memory vào business logic.

### `app/infrastructure/`

Chứa integration/cross-cutting implementation: LLM provider, observability, retry/resilience. Đây là nơi code phụ thuộc thư viện hoặc external system cụ thể.

### `app/core/`

Chứa composition root/container. Đây là nơi wire dependency thật cho runtime.

### `app/fixtures/`

Chứa dữ liệu mock lâm sàng hiện tại. Không nên gọi trực tiếp từ workflow/agent. Repository fixture mới là nơi đọc fixture.

### `tests/`

Chứa test cho API, service, workflow, memory, repository, tool, contract. Test giúp đảm bảo refactor không làm hỏng luồng cũ.

### `scripts/`

Chứa script vận hành ngoài runtime app, ví dụ SQL setup cho Supabase/LangGraph checkpoint.

## Part 4. Giải Thích Từng File Trong `app/`

### Root Files

| File | Trách nhiệm |
|---|---|
| `app/__init__.py` | Đánh dấu `app` là Python package. Không chứa business logic. |
| `app/config.py` | Định nghĩa settings/runtime config, đọc env, expose `get_settings()`. |
| `app/main.py` | FastAPI entrypoint, setup logging, register router, khai báo `/` và `/health`. |

### `app/api/`

| File | Trách nhiệm |
|---|---|
| `api/__init__.py` | Package marker. |
| `api/schemas/__init__.py` | Re-export API schemas. |
| `api/schemas/agent_requests.py` | Pydantic request schema cho chat, summary, explain alert, chat history. |

### `app/routers/`

| File | Trách nhiệm |
|---|---|
| `routers/__init__.py` | Package marker. |
| `routers/agent.py` | FastAPI endpoints cho AI Agent. Gọi `AgentService`, không chứa AI/business logic. |

### `app/contracts/`

| File | Trách nhiệm |
|---|---|
| `contracts/__init__.py` | Re-export contract public API. |
| `contracts/agent_response.py` | Contract LLM/backend response: response type, visualization, comparison, validation. |
| `contracts/tool_response.py` | Contract output chuẩn cho tool: success, not-found, error. |

### `app/agents/`

| File | Trách nhiệm |
|---|---|
| `agents/__init__.py` | Re-export agent public API. |
| `agents/clinical/__init__.py` | Re-export clinical agent. |
| `agents/clinical/agent.py` | `ClinicalAgent`, wrapper cho prompt-building behavior của clinical assistant. |
| `agents/clinical/prompts.py` | System prompt và template prompt dành riêng cho clinical agent. |

### `app/workflows/`

| File | Trách nhiệm |
|---|---|
| `workflows/__init__.py` | Re-export workflow public API. |
| `workflows/summary_workflow.py` | Orchestration cho use case tóm tắt bệnh nhân. |
| `workflows/explain_alert_workflow.py` | Orchestration cho use case giải thích cảnh báo. |
| `workflows/chat_workflow.py` | Orchestration cho chat, gồm safety gateway, patient context, generation và memory. |

### `app/services/`

| File | Trách nhiệm |
|---|---|
| `services/__init__.py` | Package marker. |
| `services/agent_service.py` | Application facade cho router. Tạo và gọi workflow tương ứng. |
| `services/prompt_builder.py` | Build prompt body từ patient/alert/history/memory context. |
| `services/generation/__init__.py` | Re-export generation service. |
| `services/generation/generation_service.py` | Điều phối LLM call, retry, parse, repair, normalize contract, clinical safety và fallback. |
| `services/parsers/__init__.py` | Re-export parser. |
| `services/parsers/agent_response_parser.py` | Parse raw LLM output thành JSON object và validate `AgentResponse`. |
| `services/safety/__init__.py` | Re-export safety service. |
| `services/safety/safety_service.py` | Prompt-injection classification và clinical safety check. |
| `services/fallback/__init__.py` | Re-export fallback builder. |
| `services/fallback/fallback_service.py` | Build fallback response theo từng endpoint/use case. |

### `app/repositories/`

| File | Trách nhiệm |
|---|---|
| `repositories/__init__.py` | Re-export repository public API. |
| `repositories/ports/__init__.py` | Re-export repository ports và errors. |
| `repositories/ports/patient_repository.py` | `PatientRepository` protocol/interface. |
| `repositories/ports/alert_repository.py` | `AlertRepository` protocol/interface. |
| `repositories/ports/errors.py` | Repository-level exceptions, ví dụ item not found. |
| `repositories/fixtures/__init__.py` | Re-export fixture repository implementations. |
| `repositories/fixtures/patient_repository.py` | Patient repository implementation đọc từ fixture data. |
| `repositories/fixtures/alert_repository.py` | Alert repository implementation đọc từ fixture data. |

### `app/tools/`

| File | Trách nhiệm |
|---|---|
| `tools/__init__.py` | Re-export tool base và registry. |
| `tools/base.py` | Tool protocol, `ToolRequest`, `ToolContext`. |
| `tools/registry.py` | Registry để đăng ký, tìm và chạy tool theo name. |
| `tools/ports/__init__.py` | Re-export tool ports. |
| `tools/ports/clinical_context_tool.py` | Port/protocol cho clinical context tool. |
| `tools/clinical/__init__.py` | Re-export clinical tool implementations. |
| `tools/clinical/patient_context_tool.py` | Tool lấy patient context qua `PatientRepository`, không đọc fixture/database trực tiếp. |

### `app/memory/`

| File | Trách nhiệm |
|---|---|
| `memory/__init__.py` | Package marker. |
| `memory/workflow.py` | Workflow memory cho chat, chọn backend manual hoặc LangGraph checkpointer. |
| `memory/state.py` | Compatibility re-export cho short-term state. |
| `memory/policy.py` | Compatibility re-export cho short-term policy. |
| `memory/short_term/__init__.py` | Re-export short-term memory API. |
| `memory/short_term/state.py` | Typed state cho conversation memory và memory turn. |
| `memory/short_term/policy.py` | Sliding-window policy, build memory context, append/compact turn. |
| `memory/short_term/manager.py` | Manual short-term memory manager: load, seed, normalize, save state. |
| `memory/summarizer/__init__.py` | Re-export summarizer API. |
| `memory/summarizer/conversation_summarizer.py` | Logic compact conversation turns thành summary text. |
| `memory/checkpointer/__init__.py` | Re-export checkpointer factory/handle. |
| `memory/checkpointer/factory.py` | Tạo in-memory hoặc Postgres/Supabase LangGraph checkpointer. |

Ghi chú: `memory/state.py` và `memory/policy.py` vẫn tồn tại như compatibility layer. Logic thật nằm trong `memory/short_term/`.

### `app/infrastructure/`

| File | Trách nhiệm |
|---|---|
| `infrastructure/__init__.py` | Package marker. |
| `infrastructure/llm/__init__.py` | Package marker cho LLM infrastructure. |
| `infrastructure/llm/ports/__init__.py` | Re-export LLM provider port. |
| `infrastructure/llm/ports/llm_provider.py` | LLM provider protocol, response object, configuration error. |
| `infrastructure/llm/providers/__init__.py` | Re-export provider implementations. |
| `infrastructure/llm/providers/openai_provider.py` | OpenAI provider implementation. Chỉ file này phụ thuộc OpenAI SDK. |
| `infrastructure/observability/__init__.py` | Re-export logging setup. |
| `infrastructure/observability/logging_config.py` | Configure Python logging cho service. |
| `infrastructure/resilience/__init__.py` | Re-export retry helpers. |
| `infrastructure/resilience/retry.py` | Retry policy cho LLM call và repair retry cho parse/contract errors. |

### `app/core/`

| File | Trách nhiệm |
|---|---|
| `core/__init__.py` | Package marker. |
| `core/container.py` | Composition root. Tạo repository, LLM provider, generation service, memory workflow, tool registry, agent service. |

### `app/fixtures/`

| File | Trách nhiệm |
|---|---|
| `fixtures/__init__.py` | Package marker. |
| `fixtures/clinical.py` | Mock clinical dataset cho patient, vitals, alerts. Chỉ repository fixture nên đọc trực tiếp file này. |

## Part 5. Project-Level Files

| File/Folder | Trách nhiệm |
|---|---|
| `backend/ai_agent/README.md` | Hướng dẫn chạy và mô tả service. |
| `backend/ai_agent/requirements.txt` | Python dependencies. |
| `backend/ai_agent/pytest.ini` | Pytest configuration. |
| `backend/ai_agent/Dockerfile` | Build container cho AI Agent service. |
| `backend/ai_agent/.env.example` | Template env vars. |
| `backend/ai_agent/.env` | Env local, không commit secret. |
| `backend/ai_agent/.dockerignore` | File ignore khi build Docker image. |
| `backend/ai_agent/scripts/create_supabase_langgraph_checkpoints.sql` | SQL setup checkpoint tables cho Supabase/Postgres memory. |

## Part 6. Test Structure

| Test file | Mục tiêu |
|---|---|
| `tests/test_agent_endpoints.py` | Test HTTP endpoints/router behavior. |
| `tests/test_agent_requests.py` | Test API request schema validation. |
| `tests/test_agent_service.py` | Test application facade và luồng service chính. |
| `tests/test_agent_service_factory.py` | Test singleton/factory cho `AgentService`. |
| `tests/test_chat_memory_policy.py` | Test memory compaction policy. |
| `tests/test_chat_memory_workflow.py` | Test chat memory workflow và fallback khi backend memory lỗi. |
| `tests/test_clinical_agent.py` | Test clinical agent prompt-building wrapper. |
| `tests/test_container.py` | Test composition root wiring. |
| `tests/test_fallback.py` | Test fallback response builders. |
| `tests/test_fixture_repositories.py` | Test repository implementation đọc fixture. |
| `tests/test_fixtures.py` | Test integrity của clinical fixture data. |
| `tests/test_generation_service.py` | Test generation service parse/repair/fallback behavior. |
| `tests/test_health.py` | Test health endpoint. |
| `tests/test_llm_client.py` | Test OpenAI provider configuration behavior. |
| `tests/test_output_parser.py` | Test parser cho raw LLM output. |
| `tests/test_prompt_builder.py` | Test prompt builder. |
| `tests/test_prompts.py` | Test clinical prompt templates. |
| `tests/test_retry.py` | Test retry/resilience helpers. |
| `tests/test_safety.py` | Test safety service. |
| `tests/test_schemas.py` | Test response contract validation. |
| `tests/test_tools.py` | Test tool contract, registry và patient context tool. |
| `tests/test_workflows.py` | Test workflow orchestration. |

## Part 7. Nên Đặt Code Mới Ở Đâu?

| Nhu cầu mới | Đặt ở đâu |
|---|---|
| Endpoint HTTP mới | `app/routers/` và schema trong `app/api/schemas/` |
| Use case orchestration mới | `app/workflows/` |
| Agent mới | `app/agents/<agent_name>/agent.py` và prompt trong cùng package |
| LLM provider mới | `app/infrastructure/llm/providers/` và port nếu cần trong `ports/` |
| Tool mới | Port trong `app/tools/ports/`, implementation trong `app/tools/<domain>/`, đăng ký trong `core/container.py` |
| Repository thật như Postgres | `app/repositories/postgres/`, implement protocol trong `repositories/ports/` |
| Memory provider/checkpointer mới | `app/memory/checkpointer/` hoặc package con tương ứng trong `app/memory/` |
| Retry/circuit breaker/rate limit | `app/infrastructure/resilience/` |
| Logging/tracing/metrics | `app/infrastructure/observability/` |
| Parser mới | `app/services/parsers/` |
| Fallback logic | `app/services/fallback/` |
| Safety rule | `app/services/safety/` |

## Part 8. Những File Root Đã Được Dọn

Các file sau từng nằm trực tiếp trong `app/`, nhưng đã được bỏ hoặc chuyển vào package đúng trách nhiệm:

| File cũ | Vị trí mới |
|---|---|
| `app/schemas.py` | `app/api/schemas/` và `app/contracts/` |
| `app/output_parser.py` | `app/services/parsers/agent_response_parser.py` |
| `app/llm_client.py` | `app/infrastructure/llm/providers/openai_provider.py` |
| `app/safety.py` | `app/services/safety/safety_service.py` |
| `app/fallback.py` | `app/services/fallback/fallback_service.py` |
| `app/prompts.py` | `app/agents/clinical/prompts.py` |
| `app/retry.py` | `app/infrastructure/resilience/retry.py` |
| `app/logging_config.py` | `app/infrastructure/observability/logging_config.py` |

## Part 9. Kiểm Tra Sau Refactor

Các lệnh đã dùng để kiểm tra:

```bash
cd backend/ai_agent
../../.venv/bin/python -m compileall -q app
../../.venv/bin/python -m pytest
```

Kết quả gần nhất sau cleanup architecture: `85 passed, 1 warning`.

Warning còn lại là `LangChainPendingDeprecationWarning` từ LangGraph checkpoint serializer, không phải lỗi kiến trúc hiện tại.
