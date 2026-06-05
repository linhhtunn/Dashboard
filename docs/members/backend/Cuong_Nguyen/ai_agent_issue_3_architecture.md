# AI Agent Issue 3 Architecture
## FastAPI Endpoints, Fixture-Driven LLM Flow & Frontend Contract

Tai lieu nay mo ta kien truc Issue 3 cua AI Agent Sprint 1: bo sung 3 endpoint FastAPI cho Team 4 Frontend, dung fixture co dinh theo `patient_id` va `alert_id`, goi LLM that cho `summary` va `explain-alert`, va tra ve Contract 6 JSON hop le cho frontend render.

Issue 3 khong phai la database integration, khong phai persistent memory, va khong phai Docker/auth. Trong phase nay, `chat` la stateless, `history` chi la optional input de prompt co them context.

---

## 1. Muc Tieu

```mermaid
flowchart LR
    FE[Doctor Dashboard / Frontend] --> API[FastAPI AI Agent Service]
    API --> CHAT[POST /api/agent/chat]
    API --> SUM[POST /api/agent/summary]
    API --> EXP[POST /api/agent/explain-alert]

    CHAT --> CONTRACT[Contract 6 JSON]
    SUM --> CONTRACT
    EXP --> CONTRACT
```

Muc tieu chinh:

- Tao 3 endpoint cong khai cho frontend.
- Bao dam moi response deu co cau truc Contract 6.
- Dung fixture co dinh de chay duoc ngay khong can DB.
- Cho phep goi LLM that khi co `OPENAI_API_KEY`.
- Safe fallback neu fixture, parse, schema, safety, hoac LLM fail.

---

## 2. So Do Tong The

```mermaid
flowchart TD
    FE[Frontend / Doctor Dashboard] --> R[FastAPI Router]
    R --> V[Request Validation]
    V --> S{Endpoint type?}

    S -->|summary| PS[Summary Prompt Builder]
    S -->|explain-alert| PE[Explain-Alert Prompt Builder]
    S -->|chat| PC[Chat Prompt Builder]

    PS --> FR[Fixture Resolver]
    PE --> FR
    PC --> FR

    FR --> L[OpenAI LLM Client]
    L --> RT[Retry / Repair Retry]
    RT --> P[Output Parser]
    P --> C[Contract 6 Validation]
    C --> G[Safety Gateway]
    G -->|safe| N[Normalize Response]
    G -->|unsafe| FB[Typed Fallback]

    RT -->|fail| FB
    P -->|parse fail| RT
    C -->|schema fail| RT

    N --> FE
    FB --> FE
```

---

## 3. Module Map

```mermaid
flowchart TB
    subgraph App["backend/ai_agent/app"]
        Main["main.py<br/>FastAPI app + health + router include"]
        Router["routers/agent.py<br/>3 agent endpoints"]
        Schemas["schemas.py<br/>Request/response models + enums"]
        Fixtures["fixtures/clinical.py<br/>patient_id / alert_id fixtures"]
        Prompts["services/prompt_builder.py<br/>prompt assembly"]
        Service["services/agent_service.py<br/>orchestration pipeline"]
        LLM["llm_client.py<br/>OpenAI call + latency/token log"]
        Parser["output_parser.py<br/>raw text -> JSON -> AgentResponse"]
        Retry["retry.py<br/>LLM retry + repair retry"]
        Safety["safety.py<br/>prompt injection + clinical safety"]
        Fallback["fallback.py<br/>typed fallback builders"]
    end

    Main --> Router
    Router --> Schemas
    Router --> Service
    Service --> Fixtures
    Service --> Prompts
    Service --> LLM
    Service --> Parser
    Service --> Retry
    Service --> Safety
    Service --> Fallback
```

Module responsibilities:

- `schemas.py`: request validation, Contract 6 response model, enum values, `generated_at` overwrite.
- `fixtures/clinical.py`: deterministic mock patient and alert data.
- `prompt_builder.py`: build prompt cho `summary`, `explain-alert`, `chat`.
- `agent_service.py`: coordinate fixture resolution, LLM call, parse, validation, safety, fallback.
- `llm_client.py`: call OpenAI và log token/latency.
- `output_parser.py`: parse raw LLM text thành JSON object va validate schema.
- `retry.py`: retry transient failures va repair retry khi parse/schema fail.
- `safety.py`: classify prompt injection va check clinical safety.
- `fallback.py`: tao response an toan theo tung `response_type`.

---

## 4. Endpoint Behavior

### 4.1 Summary

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant API as FastAPI Router
    participant FIX as Patient Fixture
    participant PROMPT as Summary Prompt
    participant LLM as OpenAI
    participant PARSER as Output Parser
    participant SAFE as Safety Gateway
    participant FB as Fallback

    FE->>API: POST /api/agent/summary {patient_id}
    API->>FIX: resolve patient fixture
    FIX-->>API: patient context
    API->>PROMPT: build summary prompt
    PROMPT-->>API: prompt text
    API->>LLM: generate_text()
    LLM-->>API: raw response text
    API->>PARSER: parse_agent_response(raw_text)
    PARSER-->>API: AgentResponse
    API->>SAFE: check_clinical_safety()
    alt safe
        SAFE-->>FE: Contract 6 summary response
    else unsafe
        SAFE-->>FB: typed summary fallback
        FB-->>FE: Contract 6 fallback
    end
```

Expected output for frontend:

- `response_type = "summary"`
- `source_id = patient_id`
- `visualizations.has_chart` co the `true` neu co du lieu time-series
- `comparisons.has_comparison` co the `false` hoac `true` tuy prompt/fixture
- `narrative_summary` giai thich xu huong va gioi han du lieu

### 4.2 Explain-Alert

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant API as FastAPI Router
    participant FIX as Alert + Patient Fixture
    participant PROMPT as Explain-Alert Prompt
    participant LLM as OpenAI
    participant PARSER as Output Parser
    participant SAFE as Safety Gateway
    participant FB as Fallback

    FE->>API: POST /api/agent/explain-alert {alert_id}
    API->>FIX: resolve alert fixture + patient context
    FIX-->>API: alert evidence + sensor context
    API->>PROMPT: build explain-alert prompt
    API->>LLM: generate_text()
    LLM-->>API: raw response text
    API->>PARSER: parse_agent_response(raw_text)
    PARSER-->>API: AgentResponse
    API->>SAFE: check_clinical_safety()
    alt safe
        SAFE-->>FE: Contract 6 explain-alert response
    else unsafe
        SAFE-->>FB: typed explain-alert fallback
        FB-->>FE: Contract 6 fallback
    end
```

Expected output for frontend:

- `response_type = "explain-alert"`
- `source_id = alert_id`
- `visualizations` thuong la chart quanh thoi diem canh bao
- `comparisons` thuong la bang evidence/diễn giải
- `narrative_summary` nhan manh y nghia canh bao va gioi han lâm sàng

### 4.3 Chat

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant API as FastAPI Router
    participant SAFE as Safety Gateway
    participant FIX as Patient Fixture
    participant PROMPT as Chat Prompt
    participant LLM as OpenAI
    participant PARSER as Output Parser
    participant FB as Fallback

    FE->>API: POST /api/agent/chat
    API->>SAFE: classify_prompt_injection(message)
    alt BLOCK
        SAFE-->>FB: typed chat fallback
        FB-->>FE: Contract 6 fallback
    else ALLOW or WARN
        SAFE->>FIX: resolve patient fixture
        FIX-->>API: patient context
        API->>PROMPT: build chat prompt + optional history
        API->>LLM: generate_text()
        LLM-->>API: raw response text
        API->>PARSER: parse_agent_response(raw_text)
        PARSER-->>API: AgentResponse
        API-->>FE: Contract 6 chat response
    end
```

Expected output for frontend:

- `response_type = "chat"`
- `source_id = conversation_id` neu co, nguoc lai `patient_id`
- `history` la optional trong Sprint 1
- `chat` hien tai la stateless, khong co server-side memory

---

## 5. Fixture Strategy

```mermaid
flowchart LR
    PID[patient_id] --> PF[Patient fixture]
    AID[alert_id] --> AF[Alert fixture]

    PF --> SUM[Summary prompt]
    PF --> CHAT[Chat prompt]
    AF --> EXP[Explain-alert prompt]
    PF --> EXP
```

Quy uoc:

- `patient_id` la khoa co dinh cho `summary` va `chat`.
- `alert_id` la khoa co dinh cho `explain-alert`.
- Fixture la du lieu mock Sprint 1, khong phai DB query.
- Khi chuyen sang giai doan sau, layer nay co the thay bang database resolver ma khong can doi router contract.

Sample fixture content:

- Patient profile
- Medical history
- Recent vitals
- Recent alerts
- Alert evidence
- Sensor context quanh thoi diem canh bao

---

## 6. Retry, Parse, Fallback

```mermaid
flowchart TD
    RAW[Raw LLM text] --> P1{Parse JSON?}
    P1 -->|yes| P2{Contract 6 valid?}
    P1 -->|no| R1[Repair retry]
    P2 -->|yes| P3{Clinical safe?}
    P2 -->|no| R1
    P3 -->|yes| DONE[Return response]
    P3 -->|no| FB[Typed fallback]

    R1 -->|attempt 1| LLM1[Call LLM]
    R1 -->|attempt 2| LLM2[Call LLM with repair prompt]
    LLM1 --> RAW
    LLM2 --> RAW
    R1 -->|exhausted| FB
```

Retry categories:

- Transient OpenAI/network/rate-limit -> `run_with_llm_retry`
- Parse or schema fail -> `run_with_repair_retry`
- Missing config -> no unbounded retry, fallback thang
- Unsafe response -> fallback

Frontend luon nhan:

- JSON hop le
- hoac typed fallback hop le
- khong nhan raw exception

---

## 7. Safety Gateway

```mermaid
stateDiagram-v2
    [*] --> Inspect
    Inspect --> ALLOW: normal clinical question
    Inspect --> WARN: sensitive advice / medication request
    Inspect --> BLOCK: prompt injection / secret exfiltration / schema bypass

    ALLOW --> Continue
    WARN --> ContinueWithGuardrails
    BLOCK --> TypedFallback
```

`WARN` trong Sprint 1 la decision noi bo, frontend khong can nhin thay decision nay.

`BLOCK` se:

- khong goi LLM
- tra fallback an toan
- giu response Contract 6

---

## 8. Contract 6 Shape

```mermaid
classDiagram
    class AgentResponse {
        schema_version: "v1"
        response_type: ResponseType
        patient_id: str
        source_id: str
        generated_at: datetime
        narrative_summary: str
        visualizations: Visualization
        comparisons: Comparison
    }

    class Visualization {
        has_chart: bool
        chart_type: str
        chart_title: str
        data_points: list[DataPoint]
    }

    class DataPoint {
        timestamp: datetime
        metric: str
        value: float
        unit: str
        status: DataPointStatus
    }

    class Comparison {
        has_comparison: bool
        comparison_type: ComparisonType
        headers: list[str]
        rows: list[list[str]]
    }

    AgentResponse --> Visualization
    AgentResponse --> Comparison
    Visualization --> DataPoint
```

Frontend should interpret:

- `has_chart = true` -> render chart
- `has_chart = false` -> hide chart
- `has_comparison = true` -> render table
- `has_comparison = false` -> hide table

`source_id` rules:

- summary -> `patient_id`
- explain-alert -> `alert_id`
- chat -> `conversation_id` if present, otherwise `patient_id`

---

## 9. Frontend Working Model

```mermaid
flowchart TB
    RESP[Agent JSON response] --> CHECK{response_type?}
    CHECK -->|summary| UI1[Summary panel + chart/table]
    CHECK -->|explain-alert| UI2[Alert explanation panel]
    CHECK -->|chat| UI3[Chat panel]

    UI1 --> A[Use narrative_summary]
    UI1 --> B[Use visualizations]
    UI1 --> C[Use comparisons]

    UI2 --> D[Use evidence-focused narrative]
    UI2 --> E[Use chart around alert time]
    UI2 --> F[Use comparison table]

    UI3 --> G[Use conversation text]
    UI3 --> H[May skip chart/table if empty]
```

Guidance for frontend:

- Do not parse raw LLM text.
- Only use Contract 6 fields.
- Response fallback vẫn là response hợp lệ để render an toàn.
- Nếu `visualizations.has_chart = false` thì đừng cố vẽ chart rỗng.
- Nếu `comparisons.has_comparison = false` thì đừng render bảng.

---

## 10. Test Coverage

```mermaid
flowchart LR
    Tests[pytest suite] --> Req[test_agent_requests.py]
    Tests --> Fix[test_fixtures.py]
    Tests --> Prompt[test_prompt_builder.py]
    Tests --> Svc[test_agent_service.py]
    Tests --> End[test_agent_endpoints.py]
    Tests --> OpenAPI[test_openapi docs]
```

Test should prove:

- request validation works
- fixtures resolve deterministically
- prompt builders include the right contract instructions
- service can parse valid LLM output
- malformed LLM output falls back safely
- missing LLM config falls back safely
- endpoints appear in OpenAPI docs

---

## 11. Ranh Gioi Voi Issue Khac

```mermaid
flowchart TB
    Issue3["Issue 3"] --> InScope["In scope"]
    Issue3 --> OutScope["Out of scope"]

    InScope --> A["FastAPI endpoints"]
    InScope --> B["Fixture-driven prompt assembly"]
    InScope --> C["LLM parse/validate/safety/retry/fallback"]
    InScope --> D["Frontend-facing Contract 6 responses"]
    InScope --> E["Tests and smoke test docs"]

    OutScope --> F["Database integration"]
    OutScope --> G["Persistent chat memory"]
    OutScope --> H["Docker / docker-compose"]
    OutScope --> I["Auth / authorization"]
```

Neu Issue 2 la "response an toan va hop contract", thi Issue 3 la "doi response an toan do thanh API surface de frontend dung duoc ngay".
