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

Frontend gọi backend AI qua route proxy nội bộ:

- FE gọi: `/api/agent/chat`
- Proxy server-side forward sang `AI_AGENT_BASE_URL + AI_AGENT_CHAT_PATH`

### Environment variables

Tạo `.env.local`:

```bash
AI_AGENT_BASE_URL=http://localhost:8005
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

### Contract backend hiện tại

OpenAPI hiện trả:

- endpoint chat thật: `POST /api/agent/chat`
- request:
  - `patient_id`
  - `conversation_id`
  - `message`
  - `history[]`
- response:
  - `narrative_summary`
  - `visualizations`
  - `comparisons`

Frontend đang map contract này sang types nội bộ ở `lib/ai/agent-adapter.ts`.

### Lưu ý

- Không gọi trực tiếp backend từ client component.
- Không commit `OPENAI_API_KEY`.
- Nếu backend đổi contract response, cập nhật mapping ở `lib/ai/agent-adapter.ts` thay vì đổi domain types FE.
- Nếu `.env.local` vẫn để `AI_AGENT_CHAT_PATH=/chat`, proxy hiện có fallback sang `/api/agent/chat`, nhưng nên sửa env cho đúng để tránh nhiễu log 404.
