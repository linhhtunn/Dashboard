# AI Agent Issue 3 Real LLM Smoke Test

Tai lieu nay dung de chay thu cong luong Issue 3 khi may da co `OPENAI_API_KEY`.

## 1. Khoi Dong App

Chay tu thu muc `backend/ai_agent`:

```bash
cd /home/cuong/Desktop/python/VinUni/software-engineering/backend/ai_agent
../../.venv/bin/python -m uvicorn app.main:app --reload --port 8005
```

## 2. Goi Health

```bash
curl http://127.0.0.1:8005/health
```

Ket qua mong doi:

```json
{
  "status": "ok",
  "service": "ai-agent",
  "model": "gpt-5.4-mini"
}
```

## 3. Goi Summary Voi LLM That

```bash
curl -X POST http://127.0.0.1:8005/api/agent/summary \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"P001"}'
```

Ket qua mong doi:

- HTTP `200`
- `response_type` la `summary`
- `patient_id` la `P001`
- `source_id` la `P001`
- Response validate duoc theo Contract 6 v1

## 4. Goi Explain Alert Voi LLM That

```bash
curl -X POST http://127.0.0.1:8005/api/agent/explain-alert \
  -H "Content-Type: application/json" \
  -d '{"alert_id":"ALT_FALL_0092"}'
```

Ket qua mong doi:

- HTTP `200`
- `response_type` la `explain-alert`
- `source_id` la `ALT_FALL_0092`
- Response co `narrative_summary`, `visualizations`, va `comparisons`

## 5. Goi Chat Stateless

```bash
curl -X POST http://127.0.0.1:8005/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "schema_version": "v1",
    "patient_id": "P001",
    "conversation_id": "CONV_P001_001",
    "message": "Nhip tim va SpO2 gan canh bao co gi dang chu y khong?"
  }'
```

Ket qua mong doi:

- HTTP `200`
- `response_type` la `chat`
- `source_id` la `CONV_P001_001`
- Chat hien tai la stateless, chua co server-side memory

## 6. Swagger

Mo:

```text
http://127.0.0.1:8005/docs
```

Can thay cac endpoint:

- `POST /api/agent/chat`
- `POST /api/agent/summary`
- `POST /api/agent/explain-alert`

## 7. Luu Y

- Neu thieu `OPENAI_API_KEY`, endpoint se tra typed fallback Contract 6 thay vi raw exception.
- Issue 3 hien dung mock fixtures co dinh theo `patient_id` va `alert_id`.
- Issue 3 chua ket noi database, chua them Docker, chua co auth, va chua co persistent chat memory.
