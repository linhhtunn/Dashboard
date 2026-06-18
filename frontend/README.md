# CareSignal AI — Frontend

Frontend là **trục chính** của MVP: UI lâm sàng, BFF (`/api/*`), seed data, và proxy agent AI đều nằm trong thư mục này.

## Product direction

- Dashboard AI-first + màn hình bệnh nhân / cảnh báo / ca trực
- Song ngữ `vi` / `en` (mặc định `vi`)
- AI chỉ hỗ trợ tóm tắt và điều hướng theo dõi — **không chẩn đoán**
- Disclaimer chuẩn: *AI support only. Not a diagnosis. Always use clinical judgment.*

## Stack

| Layer | Công nghệ |
|-------|-----------|
| Framework | Next.js 16 App Router |
| Language | TypeScript strict |
| Styling | Tailwind CSS 4 |
| Charts | Recharts |
| Icons | lucide-react |

## Chạy local

```bash
npm install
cp .env.example .env.local   # tùy chọn — cấu hình agent
npm run dev
```

Mở `http://localhost:3000` — landing công khai; đăng nhập tại `/login` để vào khu vực lâm sàng.

Scripts: `dev` · `build` · `start` · `lint`

---

## Routes (App Router)

### Marketing & auth (public)

| Route | Mô tả | Shell |
|-------|--------|-------|
| `/` | Landing — hero, tính năng, CTA | `MarketingShell` |
| `/privacy` | Chính sách bảo mật | `MarketingShell` |
| `/terms` | Điều khoản sử dụng | `MarketingShell` |
| `/login` | Đăng nhập (Supabase hoặc demo) | `AuthShell` |
| `/register` | Đăng ký tài khoản | `AuthShell` |
| `/forgot-password` | Quên mật khẩu | `AuthShell` |
| `/reset-password` | Đặt lại mật khẩu (sau email recovery) | `AuthShell` |
| `/auth/callback` | OAuth / email confirmation callback | — |

### Clinical (yêu cầu đăng nhập)

| Route | Mô tả | Shell |
|-------|--------|-------|
| `/patients` | Danh sách BN, search, bubble chat AI | `ClinicalShell` |
| `/patients/[patientId]` | Vitals, alerts, hồ sơ lâm sàng, AI chat | `ClinicalShell` |
| `/alerts` | Danh sách cảnh báo + workflow | `ClinicalShell` |
| `/staff` | Lịch ca trực tuần | `ClinicalShell` |
| `/report` | Báo cáo phân tích khoa (KPI, charts, heatmap) | `ClinicalShell` |
| `/metrics` | Demo metrics (client simulation) | `ClinicalShell` |
| `/dashboard` | AI workspace 3 cột (chat / context / evidence) | `DashboardShell` |
| `/family/[patientId]` | View gia đình (demo) | — |
| `/vitals-preview` | Preview component vitals | — |

**Navbar chính** (`ClinicalShell`): `/patients` · `/alerts` · `/staff` · `/report` · `/metrics`  
`/dashboard` tồn tại nhưng không nằm trong navbar lâm sàng.

**Global:** `GlobalAlertModal` mount tại `app/layout.tsx` — popup cảnh báo toàn cục (ẩn trên route public).

**Auth:** Supabase khi có `NEXT_PUBLIC_SUPABASE_*`; không cấu hình thì demo (`caresignal` / `demo@caresignal.ai`).

---

## Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────┐
│  Pages (app/)          Components (components/)             │
│  patients · alerts · staff · dashboard · family             │
└──────────────────────────┬──────────────────────────────────┘
                           │ repositories (lib/repositories/)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js BFF  app/api/*                                     │
│  patients · alerts · vitals · shifts · clinical · agent     │
└──────────────┬────────────────────────────┬─────────────────┘
               │                            │
               ▼                            ▼
   lib/server/clinical-store.ts    AI_AGENT_BASE_URL (optional)
   + data/*.seed.json              HF Space / Docker agent
```

### Hai nguồn dữ liệu độc lập

| Nguồn | Patient ID | Dùng cho |
|-------|------------|----------|
| **Seed store** (mặc định) | `P001`, `P002`, … | Danh sách BN, vitals, alerts, ca trực |
| **Agent backend** (khi cấu hình) | MIMIC Subject ID: `10003400`, `10014354`, … | Chat AI, tóm tắt, giải thích cảnh báo |

> Demo lâm sàng dùng `P001`. Demo agent thật cần MIMIC ID — xem [docs/HANDOVER_FRONTEND.md](../docs/HANDOVER_FRONTEND.md).

---

## Data layer

### Clinical (mặc định: in-process seed)

```
Component → lib/repositories/*.ts → lib/api/client.ts → /api/*
  → lib/mock/patient-api.ts + lib/server/clinical-store.ts
  → data/*.seed.json
```

- Seed build: `node scripts/build-all-seeds.mjs` (nếu chưa có `data/`)
- Alert workflow: `lib/mock/alert-workflow-store.ts` (in-memory, persist qua API actions)
- Shift schedule: `lib/mock/shift-store.ts` + `clinical-store`

Tùy chọn proxy ra clinical API ngoài: `NEXT_PUBLIC_CLINICAL_API_BASE`

### AI Agent

```
useAgentChatStream / chat-client.ts
  → POST /api/agent/chat  (NDJSON stream: meta → delta → complete)
  → invokeAgentChat → AI_AGENT_BASE_URL + AI_AGENT_CHAT_PATH
  → adaptBackendResponse (lib/ai/agent-adapter.ts)
```

| Proxy route | Vai trò |
|-------------|---------|
| `POST /api/agent/chat` | Router chính, stream NDJSON |
| `POST /api/agent/summary` | Dựng prompt tóm tắt → gọi cùng router |
| `POST /api/agent/explain-alert` | Gửi `metadata.alert_id` → cùng router |
| `GET /api/threads` | Proxy thread history (cần `AI_AGENT_BASE_URL`) |

Khi **không** có `AI_AGENT_BASE_URL`: mock tại `lib/ai/mock-chat.ts`.  
Khi **có** URL: luôn gọi backend; lỗi trả 502 (không fallback im lặng).

---

## Chatbot — streaming & markdown

| Module | Vai trò |
|--------|---------|
| `lib/ai/use-agent-chat-stream.ts` | Hook streaming dùng chung |
| `components/chat/AgentChatThread.tsx` | Thread UI |
| `components/chat/ChatBubbles.tsx` | User / assistant / thinking bubbles |
| `components/common/MarkdownLite.tsx` | Render `###`, bullet, **bold**, `code` |
| `lib/ai/agent-fallback.ts` | Phân loại lỗi / safe response |
| `components/chat/AgentErrorBanner.tsx` | Banner hướng dẫn khi lỗi |

**Panel dùng streaming:**

| Component | Màn hình |
|-----------|----------|
| `PatientAIChatPanel` | `/patients/[id]` |
| `AlertAIChatPanel` | Modal / panel cảnh báo |
| `PatientsBubbleChat` | Bubble chat trên `/patients` |
| `AIWorkspacePanel` | `/dashboard` |

---

## API routes (`app/api/`)

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/patients` | Danh sách BN |
| GET | `/api/patients/[id]` | Chi tiết BN |
| GET | `/api/patients/[id]/vitals` | Vitals + metric summaries |
| GET | `/api/patients/[id]/alerts` | Alerts theo BN |
| GET | `/api/alerts` | Tất cả alerts |
| GET | `/api/alerts/[id]/history` | Audit log |
| POST | `/api/alerts/[id]/actions` | Workflow (xử trí / xác nhận) |
| GET | `/api/clinical/summary` | Tổng hợp counts (navbar badge) |
| GET | `/api/clinical/zones` | Zone filters |
| GET/PUT | `/api/shifts/current` | Ca hiện tại |
| GET | `/api/shifts/current/staff` | Nhân sự ca |
| GET | `/api/shifts/schedule` | Lịch tuần |
| GET/POST/DELETE | `/api/shifts/schedule/slots` | CRUD slot |
| GET | `/api/operator/session` | Session operator demo |
| POST | `/api/agent/chat` | Agent stream |
| POST | `/api/agent/summary` | Agent summary proxy |
| POST | `/api/agent/explain-alert` | Agent explain proxy |
| GET | `/api/threads` | Thread list |
| GET | `/api/threads/[id]` | Thread detail |

Tất cả route khai báo `export const runtime = "nodejs"`.

---

## Components theo domain

```
components/
├── alerts/       Workflow, modals, AlertAIChatPanel
├── chat/         AgentChatThread, bubbles, error banner
├── clinical/     ClinicalShell, GlobalAlertModal, PatientAIChatPanel
├── dashboard/    AI workspace, conversation, vitals overview
├── patients/     List, card, table, clinical profile
├── staff/        Shift calendar, sidebar, cell modal
├── vitals/       Charts, metric cards, BP card
├── agent/        AgentInsightCard
├── common/       MarkdownLite, Navbar, PanelCard
└── providers/    LocaleProvider
```

---

## i18n

1. **Domain labels** — `LocalizedString` trên entity, resolve qua `lib/i18n/domain.ts`
2. **Static UI** — `lib/i18n/ui.ts` → `useClinicalUi()`
3. **Runtime locale** — `LocaleProvider` (`localStorage`: `care-signal-locale`)

Operator role (điều dưỡng / BS) tách biệt: `lib/operator-role.ts`

---

## Environment variables

| Biến | Bắt buộc | Mô tả |
|------|----------|--------|
| `AI_AGENT_BASE_URL` | Không | Base URL agent (HF / Docker). Không set = mock |
| `AI_AGENT_CHAT_PATH` | Không | Mặc định `/api/agent/chat` |
| `NEXT_PUBLIC_CLINICAL_API_BASE` | Không | Prefix API lâm sàng ngoài. Mặc định same-origin |

Xem `.env.example`.

---

## Clinical wording

Không dùng: *chẩn đoán*, *kết luận bệnh*, *AI khuyến nghị điều trị*

Nên dùng: *dấu hiệu bất thường*, *cần theo dõi thêm*, *có nguy cơ*, *cần bác sĩ xác nhận*

---

## Tài liệu liên quan

| File | Nội dung |
|------|----------|
| [docs/frontend-architecture.md](../docs/frontend-architecture.md) | Kiến trúc chi tiết, luồng demo |
| [docs/HANDOVER_FRONTEND.md](../docs/HANDOVER_FRONTEND.md) | Contract agent backend + map FE |
| [docs/mvp-demo-plan.md](../docs/mvp-demo-plan.md) | Kịch bản demo MVP |

---

## Lưu ý bảo mật

- Không gọi agent backend trực tiếp từ client — luôn qua `/api/agent/*`
- Không commit `.env.local`, API keys, hoặc DSN database
