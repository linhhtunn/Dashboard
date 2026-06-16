# Frontend Architecture (Source of Truth)

Tài liệu này mô tả **thực tế code trong `frontend/`** — lấy frontend làm trục chính. Backend agent và clinical API ngoài chỉ là dependency tùy chọn.

---

## 1. Vai trò frontend trong MVP

Frontend CareSignal AI đóng 3 vai trò cùng lúc:

1. **UI lâm sàng** — bác sĩ / điều dưỡng xem BN, cảnh báo, ca trực, chat AI
2. **BFF (Backend-for-Frontend)** — `app/api/*` che giấu agent URL, chuẩn hóa response
3. **Data provider demo** — seed JSON + in-memory store cho clinical khi chưa có service riêng

```
                    ┌──────────────────┐
  Browser ─────────►│  Next.js Frontend │
                    │  pages + api      │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        clinical-store   alert-workflow   AI Agent
        (seed JSON)      (in-memory)      (HF / Docker)
```

---

## 2. Cấu trúc thư mục

```
frontend/
├── app/                    # Routes + API BFF
│   ├── patients/           # Danh sách + chi tiết BN
│   ├── alerts/             # Trang cảnh báo
│   ├── staff/              # Ca trực
│   ├── dashboard/          # AI workspace
│   ├── metrics/            # Demo metrics
│   ├── family/             # View gia đình
│   └── api/                # BFF endpoints
├── components/             # UI theo domain
├── lib/
│   ├── ai/                 # Agent client, adapter, streaming
│   ├── repositories/       # Data access từ components
│   ├── mock/               # Mock builders + workflow stores
│   ├── server/             # clinical-store (server-only)
│   └── i18n/               # Labels + static copy
├── types/index.ts          # Domain + API contracts
└── data/*.seed.json        # Generated seed (build script)
```

---

## 3. Luồng dữ liệu lâm sàng

### 3.1 Đọc dữ liệu (read path)

```
Page/Component
  → *Repository.get*()          lib/repositories/
  → clinicalApiGet(path)        lib/api/client.ts
  → fetch(/api/...)             same-origin hoặc NEXT_PUBLIC_CLINICAL_API_BASE
  → route handler               app/api/*/route.ts
  → patient-api / clinical-store
  → patients.seed.json, alerts.seed.json, vitals.seed.json
```

**Repositories hiện có:**

| Repository | API paths |
|------------|-----------|
| `patient.repository` | `/api/patients`, `/api/patients/[id]` |
| `vital.repository` | `/api/patients/[id]/vitals` |
| `alert.repository` | `/api/alerts`, `/api/patients/[id]/alerts`, actions, history |
| `shift.repository` | `/api/shifts/*` |
| `clinical-summary.repository` | `/api/clinical/summary` |
| `operator-session.repository` | `/api/operator/session` |

### 3.2 Ghi workflow cảnh báo (write path)

```
GlobalAlertModal / AlertTreatmentModal / DoctorConfirmModal
  → alert.repository.postAction()
  → POST /api/alerts/[id]/actions
  → alert-workflow-store (in-memory)
  → audit log qua GET /api/alerts/[id]/history
```

Role operator (`coordinator` | `doctor`) điều khiển UI modal — lưu `localStorage` key `caresignal-operator-role`.

---

## 4. Luồng AI Agent

### 4.1 Từ UI đến backend

```
Chat Panel (client)
  → useAgentChatStream / chat-client.streamAgentChat
  → POST /api/agent/chat
       body: { threadId, patientId, locale, message, metadata?, history? }
  → [nếu không có AI_AGENT_BASE_URL] mock-chat.ts
  → [nếu có] invokeAgentChat()
       → buildAgentChatBackendBody()   # schema_version v1
       → fetch(AI_AGENT_BASE_URL + AI_AGENT_CHAT_PATH)
  → adaptBackendResponse() → AgentInsightPayload
  → NDJSON stream về client: meta | delta | complete
```

### 4.2 Map response → UI

| Backend field | FE adapter | UI render |
|---------------|------------|-----------|
| `narrative_summary` | `summary.answer` | `MarkdownLite` trong bubble |
| `visualizations` | `payload.visualization` | `AgentInsightCard` chart grid |
| `comparisons` | `payload.comparison` | `AgentInsightCard` table |
| key findings (derived) | `summary.keyFindings` | `AIAnswerCard` bullets (ẩn nếu trùng markdown) |

### 4.3 Patient ID resolution

| Input UI | Gửi lên agent | Ghi chú |
|----------|---------------|---------|
| `P001` | `P001` (uppercase) | Seed demo — agent HF **không có** fixture |
| `10003400` | `10003400` | MIMIC ID — agent HF có data |
| `patient-a` | `P001` | Alias demo |

Logic: `lib/ai/agent-chat-request.ts` → `resolveAgentPatientId()`

### 4.4 Fallback & lỗi

`lib/ai/agent-fallback.ts` phân loại:

| Kind | Khi nào | UI |
|------|---------|-----|
| `patient_not_found` | Safe response / mock fixture missing | `AgentErrorBanner` + gợi ý MIMIC ID |
| `safe_response` | Agent từ chối / thiếu context | Banner vàng-đỏ |
| `unavailable` | 502, timeout, network | Banner + gợi ý check HF health |
| `generic` | Lỗi khác | Banner chung |

---

## 5. Chat panels — ma trận tích hợp

| Panel | Route / context | Hook | Metadata đặc biệt |
|-------|-----------------|------|-------------------|
| `PatientAIChatPanel` | `/patients/[id]` | `useAgentChatStream` | — |
| `AlertAIChatPanel` | Alert modal | stream + initial `fetchAgentAlertExplanation` | `{ alert_id }` |
| `PatientsBubbleChat` | `/patients` bubble | `useAgentChatStream` | context = BN ưu tiên cao |
| `AIWorkspacePanel` | `/dashboard` | `useAgentChatStream` | + `AIAnswerCard` issue chips |

Shared UI: `AgentChatThread` + `ChatBubbles` + `MarkdownLite`

---

## 6. Màn hình & component chính

### `/patients`

- `patient-card` / `patient-table` — avatar pulse đỏ khi `openAlertCount > 0`
- `PatientsBubbleChat` — FAB chat ca trực

### `/patients/[patientId]`

- Vitals: `metric-card`, `blood-pressure-card`, `vital-chart`, `time-range-selector`
- `PatientClinicalProfilePanel` — bệnh nền + lịch thuốc
- `PatientAIChatPanel` — AI tóm tắt + Q&A stream
- Alert list inline

### `/alerts`

- `AlertZonePanel`, `alert-item`, filter theo zone/severity
- Link sang patient detail

### `/staff`

- `ShiftWeekCalendar` (~80% width) + `ShiftStaffSidebar` (~20%)
- `ShiftCellModal` — chi tiết / assign slot

### `/dashboard`

- `DashboardExperience` — layout 3 cột
- `AIWorkspacePanel` — chat + `AIAnswerCard` + issue navigation
- `PatientContextPanel`, `VitalsOverviewCard`, `EvidenceSummaryCard`
- `ChatHistoryPanel` — threads (cần agent backend)

### Global

- `GlobalAlertModal` — popup cảnh báo; workflow điều dưỡng → BS confirm
- `ClinicalShell` — navbar + locale + role switch

---

## 7. i18n & operator role

| Concern | Implementation |
|---------|----------------|
| Locale `vi`/`en` | `LocaleProvider`, `localStorage: care-signal-locale` |
| Domain labels | `LocalizedString` trên `Patient`, `Alert`, … |
| Static nav/copy | `lib/i18n/ui.ts` |
| Operator role | `useOperatorRole()` — `coordinator` / `doctor` |

---

## 8. Environment & modes

| Mode | `AI_AGENT_BASE_URL` | Clinical data | Chat behavior |
|------|---------------------|---------------|---------------|
| **Offline demo** | unset | seed store | Mock chat local |
| **HF agent** | `https://cuongnd03-health-app.hf.space` | seed store | Real agent, MIMIC IDs |
| **Local agent** | `http://127.0.0.1:8005` | seed store | Real agent Docker |
| **External clinical** | any | `NEXT_PUBLIC_CLINICAL_API_BASE` | Repositories proxy ra ngoài |

---

## 9. Kịch bản demo khuyến nghị

### Golden path A — Clinical (không cần agent)

1. `/patients` → mở `P001`
2. Xem vitals, alerts, clinical profile
3. `/alerts` → workflow xử trí cảnh báo (đổi role BS)
4. `/staff` → xem lịch ca

### Golden path B — Agent thật

1. Set `.env.local` với `AI_AGENT_BASE_URL`
2. Mở `/patients/10003400` (hoặc `10014354`)
3. `PatientAIChatPanel` → "Tóm tắt tình trạng"
4. Quan sát stream + markdown render

### Tránh khi demo agent

- Dùng `P001` với HF agent → sẽ thấy `AgentErrorBanner` (patient_not_found) — đây là hành vi đúng

---

## 10. Chưa implement / giới hạn

- Real-time WebSocket cho vitals/alerts
- Clinical backend tách riêng (mặc định vẫn seed store)
- Thread history khi không có agent backend
- Full e2e test automation
- i18n 100% (một số copy vẫn inline bilingual)

---

## 11. File tham chiếu nhanh

| Cần sửa gì | File |
|------------|------|
| Thêm API clinical | `app/api/` + `lib/repositories/` |
| Đổi map agent response | `lib/ai/agent-adapter.ts` |
| Đổi prompt summary/explain | `lib/ai/agent-chat-request.ts` |
| Đổi UI chat | `components/chat/`, `use-agent-chat-stream.ts` |
| Seed data BN | `scripts/build-all-seeds.mjs`, `data/*.seed.json` |
| Navbar routes | `components/clinical/ClinicalShell.tsx` |
| Alert workflow | `lib/mock/alert-workflow-store.ts`, modals trong `components/alerts/` |
