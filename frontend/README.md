# CareSignal AI Frontend

Frontend cho CareSignal AI, tập trung vào dashboard lâm sàng AI-first và các màn bệnh nhân cho MVP.

## Product Direction

- Dashboard 2 panel: chat AI bên trái, ngữ cảnh bệnh nhân bên phải
- Frontend song ngữ `vi/en`
- Locale mặc định là `vi`
- AI chỉ hỗ trợ tóm tắt và điều hướng theo dõi, không chẩn đoán

## Core Stack

- Next.js App Router
- TypeScript strict
- Tailwind CSS
- `lucide-react`
- `recharts`

## Routes

- `/dashboard`
- `/patients`
- `/patients/[patientId]`
- `/vitals-preview`

## Clinical Wording Rules

Không dùng:

- chẩn đoán
- kết luận bệnh
- AI khuyến nghị điều trị

Nên dùng:

- dấu hiệu bất thường
- cần theo dõi thêm
- có nguy cơ
- cần bác sĩ xác nhận

Disclaimer chuẩn:

`AI support only. Not a diagnosis. Always use clinical judgment.`

## Local Development

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`.

## AI Agent Backend

Backend AI dùng **một router thống nhất** `POST /api/agent/chat` (Contract v1).  
Các intent như tóm tắt bệnh án và giải thích cảnh báo đều đi qua endpoint này — xem `docs/HANDOVER_FRONTEND.md`.

Luồng FE:

- Component gọi proxy Next.js: `/api/agent/chat`, `/api/agent/summary`, `/api/agent/explain-alert`
- Proxy server-side forward sang `AI_AGENT_BASE_URL + AI_AGENT_CHAT_PATH` (mặc định `/api/agent/chat`)
- Summary / explain-alert proxy tự dựng `message` + `metadata.alert_id` rồi gọi cùng router

### Environment variables

Tạo `.env.local`:

```bash
# Production HF
# AI_AGENT_BASE_URL=https://cuongnd03-health-app.hf.space

# Local
AI_AGENT_BASE_URL=http://127.0.0.1:8005
AI_AGENT_CHAT_PATH=/api/agent/chat
```

### Local Docker backend

```powershell
docker pull cuong111103hd/ai-agent:latest

docker run --rm -p 8005:7860 `
  -e OPENAI_API_KEY="YOUR_NEW_KEY" `
  -e MEMORY_CHECKPOINTER="supabase" `
  -e MEMORY_POSTGRES_DSN="postgresql://postgres.lopyaudwououijmvaisa:Healthapp%40vsf@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres" `
  cuong111103hd/ai-agent:latest
```

Sau khi container lên:

- docs: `http://localhost:8005/docs`
- health: `http://localhost:8005/health`

### Contract backend (v1)

Request (`ChatRequest`):

- `schema_version`: `"v1"`
- `patient_id`, `message` (bắt buộc)
- `conversation_id`, `doctor_id` (tùy chọn, mặc định doctor `D1`)
- `metadata` — ví dụ `{ "alert_id": "ALT-001" }` khi giải thích cảnh báo

Response (`AgentResponse`): `narrative_summary`, `visualizations`, `comparisons`  
→ map tại `lib/ai/agent-adapter.ts`

Bệnh nhân thử nghiệm trên Supabase (MIMIC):  
`10014354`, `10003400`, `10040025`, … — xem `docs/HANDOVER_FRONTEND.md`.

### Lưu ý

- Không gọi trực tiếp backend từ client component.
- Không commit `OPENAI_API_KEY`.
- Khi **không** có `AI_AGENT_BASE_URL`, proxy trả mock local; khi có URL thì luôn gọi backend thật.
