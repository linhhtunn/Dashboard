# MVP Demo Plan

> Cập nhật theo **frontend hiện tại** (`frontend/` là source of truth).  
> Chi tiết kiến trúc: [frontend-architecture.md](./frontend-architecture.md)

## Mục tiêu demo

Hai luồng độc lập — có thể demo riêng hoặc kết hợp:

| Luồng | Patient ID | Cần agent? | Màn hình chính |
|-------|------------|------------|----------------|
| **A. Clinical** | `P001` (seed) | Không | `/patients`, `/alerts`, `/staff` |
| **B. AI Agent** | MIMIC `10003400` | Có (`AI_AGENT_BASE_URL`) | `/patients/10003400`, `/dashboard` |

---

## Chuẩn bị môi trường

```bash
cd frontend
npm install
cp .env.example .env.local
```

**Chỉ demo clinical (A):** không cần set `AI_AGENT_BASE_URL` — mock chat local.

**Demo agent thật (B):**

```bash
AI_AGENT_BASE_URL=https://cuongnd03-health-app.hf.space
AI_AGENT_CHAT_PATH=/api/agent/chat
```

Health check: `curl https://cuongnd03-health-app.hf.space/health` (cold start ~30s).

---

## Kịch bản A — Clinical (5 phút, không agent)

### 1. Danh sách bệnh nhân
- Mở `/patients`
- Danh sách load từ seed store qua `/api/patients`
- Avatar **pulse đỏ** khi BN có cảnh báo mở
- Search `P001` → mở chi tiết

### 2. Chi tiết bệnh nhân
- Mở `/patients/P001`
- Vitals charts + metric summaries (`/api/patients/P001/vitals`)
- `PatientClinicalProfilePanel` — bệnh nền, lịch thuốc
- Alerts inline (`/api/patients/P001/alerts`)
- AI chat: mock local (không cần HF)

### 3. Cảnh báo & workflow
- Mở `/alerts` — filter theo zone/severity
- `GlobalAlertModal` (popup toàn cục từ layout)
- Role **điều dưỡng** → `AlertTreatmentModal` ghi xử trí
- Đổi role **bác sĩ** (navbar) → `DoctorConfirmModal` xác nhận
- Audit: `GET /api/alerts/[id]/history`

### 4. Ca trực
- Mở `/staff`
- Lịch tuần + sidebar nhân sự
- Click ô lịch → `ShiftCellModal`

---

## Kịch bản B — AI Agent (5 phút, cần HF)

### 1. Patient với MIMIC ID
- Mở `/patients/10003400` (hoặc `10014354` cho case thuốc/CDSS)
- `PatientAIChatPanel` → **Tóm tắt tình trạng**
- Quan sát: thinking → stream token → markdown render

### 2. Follow-up chat
- Gợi ý: "Chỉ số nào cần ưu tiên theo dõi?"
- Response stream qua `useAgentChatStream`

### 3. Giải thích cảnh báo
- Từ `/alerts` hoặc `GlobalAlertModal` → mở AI panel
- `AlertAIChatPanel` load explanation + `metadata.alert_id` cho follow-up

### 4. Dashboard AI workspace
- Mở `/dashboard`
- Chat → `AIAnswerCard` + issue chips (SpO₂, BP, HR) khi response hợp lệ
- Thread history (cần agent backend cho `/api/threads`)

### 5. Bubble chat ca trực
- `/patients` → FAB góc phải → `PatientsBubbleChat`

---

## Script demo nhanh (< 5 phút)

**Clinical only:**
1. `/patients` → `P001` → vitals + profile
2. `/alerts` → workflow xử trí (đổi role BS)
3. `/staff` → lịch ca

**Agent + clinical:**
1. `/patients/10003400` → tóm tắt AI (stream)
2. `/alerts` → giải thích cảnh báo AI
3. `/dashboard` → 1 câu hỏi + mở issue chip

---

## Điều cần tránh khi demo

| Tình huống | Kết quả | Cách xử lý |
|------------|---------|------------|
| Chat AI với `P001` + HF agent | `AgentErrorBanner` patient_not_found | Dùng `10003400` hoặc tắt `AI_AGENT_BASE_URL` để mock |
| Thread history không load | 500 từ `/api/threads` | Cần `AI_AGENT_BASE_URL`; hoặc bỏ qua trong demo |
| HF cold start | Timeout 30s+ | Gọi `/health` trước khi demo |

---

## API checklist (smoke test)

```bash
# Clinical (seed)
curl http://localhost:3000/api/patients
curl http://localhost:3000/api/patients/P001
curl http://localhost:3000/api/patients/P001/alerts
curl http://localhost:3000/api/clinical/summary

# Agent (cần .env.local)
curl -X POST http://localhost:3000/api/agent/summary \
  -H "Content-Type: application/json" \
  -d '{"patientId":"10003400","locale":"vi","threadId":"demo-1","message":"Tóm tắt bệnh án."}'
```

---

## Out of scope hiện tại

- WebSocket real-time vitals/alerts
- Clinical backend tách khỏi Next.js seed store
- Agent chart time-series render (Recharts) từ `visualizations.data_points`
- Full e2e automation
- i18n/encoding 100%

---

## Nếu cần demo gấp — freeze scope tối thiểu

1. `/patients/P001` — vitals + alerts (không agent)
2. `/patients/10003400` — 1 lượt AI tóm tắt (có agent)
3. `/alerts` — 1 workflow xử trí cảnh báo
