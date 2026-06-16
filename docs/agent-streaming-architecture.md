# Agent Streaming Architecture — Phân tích chi tiết

Tài liệu trả lời 3 câu hỏi về luồng chat AI trên frontend, kèm **toàn bộ nội dung** các file liên quan.

---

## Tóm tắt nhanh

| Thành phần | Công nghệ stream | Ghi chú |
|------------|------------------|---------|
| `use-agent-chat-stream.ts` | **NDJSON** (gián tiếp) | Hook gọi `streamAgentChat()` — không tự parse stream |
| `app/api/agent/chat/route.ts` | **NDJSON** | `Content-Type: application/x-ndjson`, mỗi dòng = 1 JSON event |
| Backend HF agent | **JSON thuần** (không stream) | BFF nhận full response rồi **tái stream** ra client |
| `agent-adapter.ts` | **AgentResponse v1** | Parse `narrative_summary`, `visualizations`, `comparisons` |

**Không dùng SSE** (`text/event-stream`, `data: ...`, `event:`). Toàn bộ pipeline client ↔ BFF là **NDJSON over HTTP chunked body**.

---

## 1. `lib/ai/use-agent-chat-stream.ts` — NDJSON hay SSE?

### Kết luận: **NDJSON** (không phải SSE)

Hook **không** tự mở `fetch` hay parse stream. Nó delegate sang `streamAgentChat()` trong `lib/ai/chat-client.ts`.

### Luồng hoạt động

```
submitQuestion()
  → streamAgentChat({ threadId, patientId, message, ... }, handlers)
       → POST /api/agent/chat
       → response.body.getReader()  (ReadableStream)
       → split buffer theo \n
       → JSON.parse từng dòng → AgentChatStreamEvent
  → onDelta: append text vào assistant bubble
  → onComplete: ghi đè content = payload.summary.answer + fallbackKind
```

### 3 loại event NDJSON

Định nghĩa tại `lib/ai/types.ts`:

```typescript
type AgentChatStreamEvent =
  | { type: "meta"; threadId; title; suggestedIssueIds }
  | { type: "delta"; text: string }
  | { type: "complete"; payload: AgentChatProxyPayload }
```

### Hành vi hook

1. Thêm user message + assistant message rỗng (`content: ""`)
2. Set `streamingMessageId` → UI hiện thinking / cursor
3. Mỗi `delta` → nối `text` vào bubble (typing effect)
4. `complete` → thay toàn bộ bằng `payload.summary.answer` (chuẩn hóa từ adapter) + `classifyAgentAnswer()`
5. Nếu không có delta nào → error message
6. Catch → `AgentErrorBanner` qua `fallbackKind`

### SSE vs NDJSON — tại sao không phải SSE?

| SSE | NDJSON (hiện tại) |
|-----|-------------------|
| `Content-Type: text/event-stream` | `Content-Type: application/x-ndjson` |
| `data: {...}\n\n` | `{...}\n` mỗi dòng |
| `EventSource` API | `fetch` + `ReadableStream` + manual line split |
| Chuẩn browser push | Custom protocol đơn giản |

---

## 2. `app/api/agent/chat/route.ts` — BFF proxy forward thế nào?

### Kết luận: BFF **không forward stream** từ backend. Nó **blocking fetch JSON** rồi **tự tạo NDJSON stream** cho client.

### Sơ đồ

```
Client                    Next.js BFF                         Agent Backend
  |                            |                                    |
  | POST /api/agent/chat       |                                    |
  | (AgentChatProxyRequest)    |                                    |
  |--------------------------->|                                    |
  |                            | [nếu không có AI_AGENT_BASE_URL]   |
  |                            |   → buildMockChatPayload()         |
  |                            |                                    |
  |                            | [nếu có AI_AGENT_BASE_URL]         |
  |                            |   invokeAgentChat()                |
  |                            |   → POST {base}/api/agent/chat     |
  |                            |   → JSON AgentResponse (full)      |
  |                            |   → adaptBackendResponse()         |
  |                            |                                    |
  |                            | createStreamResponse(payload)      |
  |                            |   meta → delta×N → complete        |
  |<---------------------------|                                    |
  | NDJSON stream              |                                    |
```

### Bước chi tiết

#### A. Validate request

- `message`, `threadId`, `patientId` bắt buộc
- `patientId` qua `resolveAgentPatientId()` (uppercase demo ID, giữ nguyên MIMIC numeric)

#### B. Nhánh mock (không config backend)

```typescript
if (!isAgentBackendConfigured()) {
  const payload = buildMockChatPayload({ ... });
  return createStreamResponse(payload, { typingDelayMs: 90 });
}
```

#### C. Nhánh backend thật

```typescript
const raw = await invokeAgentChat({
  patientId, conversationId: threadId, doctorId: userId,
  message, metadata, history,
});
const payload = { ...adaptBackendResponse({ raw, ... }), threadId };
return createStreamResponse(payload, { typingDelayMs: 70 });
```

`invokeAgentChat` → `callAgentEndpoint` → `fetch(AI_AGENT_BASE_URL + AI_AGENT_CHAT_PATH)` với body Contract v1:

```json
{
  "schema_version": "v1",
  "patient_id": "10003400",
  "conversation_id": "thread-xxx",
  "doctor_id": "D1",
  "message": "...",
  "metadata": { "alert_id": "..." }
}
```

Backend trả **một JSON object** (`application/json`), không phải stream.

#### D. `createStreamResponse` — synthetic typing stream

```typescript
// Mỗi event = 1 dòng JSON + \n
send({ type: "meta", threadId, title, suggestedIssueIds });
for (const chunk of chunkText(payload.summary.answer)) {
  await sleep(typingDelayMs);  // 70ms hoặc 90ms
  send({ type: "delta", text: chunk });
}
send({ type: "complete", payload });
```

`chunkText()` chia answer theo **4 từ/chunk** để giả lập gõ từng đợt.

#### E. Error handling

- `BackendAgentError` status < 500 → trả text plain + status tương ứng
- Khác → 502

### Response headers

```
Content-Type: application/x-ndjson; charset=utf-8
Cache-Control: no-cache, no-transform
```

---

## 3. `lib/ai/agent-adapter.ts` — Parse response format nào?

### Kết luận: **Agent Backend Contract v1** (`AgentResponse`)

Input `raw: unknown` — JSON từ HF/local agent. Output `AgentInsightPayload` — model nội bộ FE.

### Contract v1 (backend → adapter)

```json
{
  "schema_version": "v1",
  "response_type": "chat",
  "patient_id": "10003400",
  "source_id": "session-xxx",
  "generated_at": "2026-06-12T08:23:09.860896Z",
  "narrative_summary": "### Tóm tắt...\n- **Điểm 1**...",
  "visualizations": {
    "has_chart": true,
    "chart_type": "time-series",
    "chart_title": "...",
    "data_points": [
      { "timestamp", "metric", "value", "unit", "status" }
    ]
  },
  "comparisons": {
    "has_comparison": true,
    "comparison_type": "alert-evidence",
    "headers": ["..."],
    "rows": [["...", "..."]]
  }
}
```

### Mapping chính → `AgentInsightPayload`

| Backend field | Adapter function | FE field |
|---------------|------------------|----------|
| `narrative_summary` / `answer` / `response` / ... | `extractAnswer()` | `summary.answer` |
| `key_findings` / bullets từ markdown | `extractKeyFindings()` | `summary.keyFindings` |
| `visualizations` | `extractVisualization()` | `visualization` |
| `visualizations.data_points` | `extractEvidence()` | `summary.evidence` |
| `comparisons` | `extractComparison()` | `comparison` |
| `comparisons.rows` | `extractEvidence()` | `summary.evidence` |
| `response_type` | `extractResponseType()` | `responseType` |
| `generated_at` | `extractGeneratedAt()` | `generatedAt` |
| `intent` | `extractIntent()` | `intent` |
| `focus_metrics` | `extractFocusMetrics()` | `focusMetrics` |
| `recommended_issue_id` | `extractRecommendedIssueId()` | `recommendedIssueId` |
| Text + evidence heuristic | `inferIssueIds()` | `suggestedIssueIds` |
| `confidence` / evidence count | `extractConfidence()` | `summary.confidence` |
| `next_actions` | `extractNextActions()` | `nextActions` |

### `extractAnswer` — fallback chain

Thử lần lượt (string non-empty):

1. `narrative_summary`
2. `narrativeSummary`
3. `answer`
4. `response`
5. `message`
6. `content`

Nếu không có → message mặc định VI/EN.

### `extractKeyFindings` — thứ tự ưu tiên

1. Array từ `key_findings` / `keyFindings` / `highlights` / `bullets`
2. Evidence objects → câu mô tả metric
3. Bullet lines `- ...` từ markdown answer
4. Split câu theo `.!?` (bỏ qua dòng heading `###`)
5. `[]` nếu answer là markdown thuần (tránh duplicate raw `###` trên UI)

### Issue inference (dashboard chips)

`inferIssueIds()` quét text + evidence metrics:

- `spo2` / `oxygen` → issue `spo2`
- `blood pressure` / `systolic` / `huyet ap` → `blood_pressure`
- `heart rate` / `respiratory rate` / `nhip tim` → `heart_rate`

### Metric normalization

`normalizeMetric()` map alias: `hr` → `heart_rate`, `rr` → `respiratory_rate`, `sbp` → `systolic_bp`, v.v.

---

## File liên quan bổ sung: `lib/ai/chat-client.ts`

Hook dùng file này để parse NDJSON. Parser:

```typescript
buffer += decoder.decode(value, { stream: true });
const lines = buffer.split("\n");
buffer = lines.pop() ?? "";
for (const line of lines) {
  const event = JSON.parse(line.trim()) as AgentChatStreamEvent;
  // dispatch meta | delta | complete
}
```

Yêu cầu event `complete` phải có — nếu không throw error.

---

## Toàn bộ nội dung file

### `frontend/lib/ai/use-agent-chat-stream.ts`

```typescript
"use client";

import { useCallback, useRef, useState } from "react";

import {
  classifyAgentAnswer,
  classifyAgentError,
  type AgentFallbackKind,
} from "@/lib/ai/agent-fallback";
import { streamAgentChat } from "@/lib/ai/chat-client";
import type {
  AgentChatProxyRequest,
  AgentChatThreadMessage,
  AgentInsightPayload,
} from "@/lib/ai/types";
import type { Locale } from "@/types";

type UseAgentChatStreamOptions = {
  threadId: string;
  patientId: string;
  locale: Locale;
  userId?: string;
  metadata?: AgentChatProxyRequest["metadata"];
  onComplete?: (payload: AgentInsightPayload) => void;
};

export function useAgentChatStream({
  threadId,
  patientId,
  locale,
  userId = "clinician-local",
  metadata,
  onComplete,
}: UseAgentChatStreamOptions) {
  const [messages, setMessages] = useState<AgentChatThreadMessage[]>([]);
  const [chatting, setChatting] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const messageCounter = useRef(0);

  const submitQuestion = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || chatting) return;

      messageCounter.current += 1;
      const messageId = messageCounter.current;
      const userId = `user-${messageId}`;
      const assistantId = `assistant-${messageId}`;
      const history = messages
        .filter((message) => message.content && !message.isError)
        .map(({ role, content }) => ({ role, content }));

      setMessages((current) => [
        ...current,
        { id: userId, role: "user", content: trimmed },
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setChatting(true);
      setStreamingMessageId(assistantId);
      setError(null);

      try {
        let hasStreamed = false;
        await streamAgentChat(
          {
            threadId,
            patientId,
            locale,
            question: trimmed,
            message: trimmed,
            userId,
            metadata,
            history,
          },
          {
            onDelta: ({ text }) => {
              hasStreamed = true;
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantId
                    ? { ...message, content: `${message.content}${text}` }
                    : message,
                ),
              );
            },
            onComplete: ({ payload }) => {
              const answer = payload.summary.answer;
              const fallbackKind = classifyAgentAnswer(answer);
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantId
                    ? { ...message, content: answer, fallbackKind }
                    : message,
                ),
              );
              onComplete?.(payload);
            },
          },
        );

        if (!hasStreamed) {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId && !message.content
                ? {
                    ...message,
                    content:
                      locale === "vi"
                        ? "Agent không trả về nội dung."
                        : "Agent returned no content.",
                    isError: true,
                  }
                : message,
            ),
          );
        }
      } catch (nextError: unknown) {
        const raw =
          nextError instanceof Error
            ? nextError.message
            : locale === "vi"
              ? "Không thể kết nối với AI."
              : "Unable to reach the AI service.";
        const kind = classifyAgentError(raw);
        setError(raw);
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? {
                  ...item,
                  content: "",
                  isError: true,
                  fallbackKind: kind,
                }
              : item,
          ),
        );
      } finally {
        setChatting(false);
        setStreamingMessageId(null);
      }
    },
    [chatting, locale, messages, metadata, onComplete, patientId, threadId, userId],
  );

  const setAssistantMessage = useCallback(
    (id: string, content: string, fallbackKind?: AgentFallbackKind | null) => {
      setMessages([{ id, role: "assistant", content, fallbackKind }]);
    },
    [],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const prependMessages = useCallback((items: AgentChatThreadMessage[]) => {
    setMessages((current) => [...items, ...current]);
  }, []);

  return {
    messages,
    setMessages,
    chatting,
    streamingMessageId,
    error,
    submitQuestion,
    setAssistantMessage,
    prependMessages,
    clearMessages,
  };
}
```

---

### `frontend/app/api/agent/chat/route.ts`

```typescript
import { NextRequest } from "next/server";

import { adaptBackendResponse, buildThreadTitle } from "@/lib/ai/agent-adapter";
import { buildMockChatPayload } from "@/lib/ai/mock-chat";
import { BackendAgentError, invokeAgentChat } from "@/lib/ai/invoke-agent-chat";
import { isAgentBackendConfigured } from "@/lib/ai/agent-backend";
import type {
  AgentChatProxyPayload,
  AgentChatProxyRequest,
  AgentChatStreamEvent,
} from "@/lib/ai/types";
import { resolveAgentPatientId } from "@/lib/ai/agent-chat-request";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AgentChatProxyRequest;
  const normalizedPatientId = resolveAgentPatientId(body.patientId ?? "");

  if (!body.message?.trim() || !body.threadId || !normalizedPatientId) {
    return new Response("Thiếu dữ liệu bắt buộc cho request chatbot.", {
      status: 400,
    });
  }

  const title = buildThreadTitle(body.message, body.locale);

  if (!isAgentBackendConfigured()) {
    const payload = buildMockChatPayload({
      locale: body.locale,
      message: body.message,
      patientId: normalizedPatientId,
      patientContext: null,
      threadId: body.threadId,
      title,
    });
    return createStreamResponse(payload, { typingDelayMs: 90 });
  }

  try {
    const raw = await invokeAgentChat({
      patientId: normalizedPatientId,
      conversationId: body.threadId,
      doctorId: body.userId,
      message: body.message,
      metadata: body.metadata,
      history: body.history,
    });

    const payload = {
      ...adaptBackendResponse({
        patientId: normalizedPatientId,
        locale: body.locale,
        question: body.message,
        title,
        raw,
      }),
      threadId: body.threadId,
    };

    return createStreamResponse(payload, { typingDelayMs: 70 });
  } catch (error) {
    if (error instanceof BackendAgentError && error.status < 500) {
      return new Response(error.message, { status: error.status });
    }

    const message =
      error instanceof Error
        ? error.message
        : "Không thể kết nối backend AI.";
    return new Response(message, { status: 502 });
  }
}

function createStreamResponse(
  payload: AgentChatProxyPayload,
  options: { typingDelayMs: number },
) {
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AgentChatStreamEvent) => {
        controller.enqueue(`${JSON.stringify(event)}\n`);
      };

      send({
        type: "meta",
        threadId: payload.threadId,
        title: payload.title,
        suggestedIssueIds: payload.suggestedIssueIds,
      });

      for (const chunk of chunkText(payload.summary.answer)) {
        await sleep(options.typingDelayMs);
        send({
          type: "delta",
          text: chunk,
        });
      }

      await sleep(Math.max(40, Math.round(options.typingDelayMs / 2)));
      send({
        type: "complete",
        payload,
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

function chunkText(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [text];

  const chunks: string[] = [];
  for (let index = 0; index < words.length; index += 4) {
    const slice = words.slice(index, index + 4).join(" ");
    const suffix = index + 4 < words.length ? " " : "";
    chunks.push(`${slice}${suffix}`);
  }

  return chunks;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

---

### `frontend/lib/ai/agent-adapter.ts`

```typescript
import type { AIConfidence, Evidence, Locale, VitalMetric } from "@/types";
import type {
  AgentChatIntent,
  AgentComparisonPayload,
  AgentInsightPayload,
  AgentResponseType,
  AgentVisualizationPayload,
  AgentVisualizationPoint,
  DashboardIssueId,
} from "@/lib/ai/types";

type AdaptBackendArgs = {
  patientId: string;
  locale: Locale;
  question: string;
  title: string;
  raw: unknown;
};

type LooseRecord = Record<string, unknown>;

export function adaptBackendResponse({
  patientId,
  locale,
  question,
  title,
  raw,
}: AdaptBackendArgs): AgentInsightPayload {
  const answer = extractAnswer(raw, locale);
  const evidence = extractEvidence(raw);
  const keyFindings = extractKeyFindings(raw, answer, evidence, locale);
  const intent = extractIntent(raw);
  const focusMetrics = extractFocusMetrics(raw, evidence);
  const recommendedIssueId = extractRecommendedIssueId(raw, focusMetrics);
  const fallbackIssueIds = inferIssueIds(answer, keyFindings, evidence);
  const suggestedIssueIds = dedupeIssues(
    recommendedIssueId ? [recommendedIssueId, ...fallbackIssueIds] : fallbackIssueIds,
    focusMetrics,
  );
  const confidence = extractConfidence(raw, evidence);
  const generatedAt = extractGeneratedAt(raw);
  const visualization = extractVisualization(raw);
  const comparison = extractComparison(raw);
  const responseType = extractResponseType(raw);
  const sourceId = extractSourceId(raw, title);
  const nextActions = extractNextActions(raw);

  return {
    title,
    responseType,
    patientId,
    sourceId,
    generatedAt,
    intent,
    suggestedIssueIds,
    recommendedIssueId,
    focusMetrics,
    nextActions,
    summary: {
      patientId,
      locale,
      question,
      answer,
      keyFindings,
      status: "ready",
      confidence,
      evidence,
      generatedAt,
      disclaimerKey: "ai_support_only",
    },
    visualization,
    comparison,
  };
}

function extractAnswer(raw: unknown, locale: Locale) {
  const record = asRecord(raw);
  const candidates = [
    record?.narrative_summary,
    record?.narrativeSummary,
    record?.answer,
    record?.response,
    record?.message,
    record?.content,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return locale === "vi"
    ? "Hệ thống AI chưa trả về phần tóm tắt có thể đọc được."
    : "The AI backend did not return a readable summary.";
}

function extractKeyFindings(
  raw: unknown,
  answer: string,
  evidence: Evidence[],
  locale: Locale,
) {
  const record = asRecord(raw);
  const candidates = [
    record?.key_findings,
    record?.keyFindings,
    record?.highlights,
    record?.bullets,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;

    const normalized = candidate
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4);

    if (normalized.length > 0) return normalized;
  }

  if (evidence.length > 0) {
    return evidence.slice(0, 4).map((item) => buildEvidenceFinding(item, locale));
  }

  if (/^#{1,3}\s/m.test(answer) || /\n[-*]\s+/m.test(answer)) {
    const bullets = answer
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^[-*]\s+/.test(line))
      .map((line) => line.replace(/^[-*]\s+/, "").trim())
      .filter(Boolean)
      .slice(0, 4);

    if (bullets.length > 0) return bullets;
    return [];
  }

  const fallback = answer
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter((item) => item && !/^#{1,3}\s/.test(item))
    .slice(0, 4);

  return fallback.length > 0
    ? fallback
    : [];
}

function extractIntent(raw: unknown): AgentChatIntent {
  const record = asRecord(raw);
  const value = asString(record?.intent)?.toLowerCase();

  if (
    value === "general_chat" ||
    value === "patient_summary" ||
    value === "patient_metric_or_protocol"
  ) {
    return value;
  }

  return "patient_summary";
}

function extractFocusMetrics(raw: unknown, evidence: Evidence[]) {
  const record = asRecord(raw);
  const candidate = record?.focus_metrics ?? record?.focusMetrics;
  const metrics = Array.isArray(candidate)
    ? candidate
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  if (metrics.length > 0) return metrics;

  return evidence
    .map((item) => item.metric)
    .filter((metric): metric is VitalMetric => Boolean(metric));
}

function extractRecommendedIssueId(
  raw: unknown,
  focusMetrics: string[],
): DashboardIssueId | null {
  const record = asRecord(raw);
  const explicit = asString(
    record?.recommended_issue_id ?? record?.recommendedIssueId,
  );
  const normalizedExplicit = normalizeIssueId(explicit);
  if (normalizedExplicit) return normalizedExplicit;

  for (const metric of focusMetrics) {
    const inferred = mapMetricToIssue(metric);
    if (inferred) return inferred;
  }

  return null;
}

function extractNextActions(raw: unknown) {
  const record = asRecord(raw);
  const candidate = record?.next_actions ?? record?.nextActions;
  if (!Array.isArray(candidate)) return [];

  return candidate
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function extractEvidence(raw: unknown): Evidence[] {
  const record = asRecord(raw);
  const evidence: Evidence[] = [];

  const visualization = asRecord(record?.visualizations);
  const dataPoints = Array.isArray(visualization?.data_points)
    ? visualization.data_points
    : [];

  for (const point of dataPoints) {
    const mapped = mapDataPoint(point);
    if (mapped) evidence.push(mapped);
  }

  const comparison = asRecord(record?.comparisons);
  const rows = Array.isArray(comparison?.rows) ? comparison.rows : [];
  for (const row of rows) {
    const mapped = mapComparisonRow(row);
    if (mapped) evidence.push(mapped);
  }

  return evidence.slice(0, 8);
}

function extractVisualization(raw: unknown): AgentVisualizationPayload {
  const record = asRecord(raw);
  const visualization = asRecord(record?.visualizations);
  const dataPoints = Array.isArray(visualization?.data_points)
    ? visualization.data_points
        .map(mapVisualizationPoint)
        .filter((item): item is AgentVisualizationPoint => item !== null)
    : [];

  return {
    hasChart: Boolean(visualization?.has_chart),
    chartType: asString(visualization?.chart_type) ?? "time-series",
    chartTitle: asString(visualization?.chart_title) ?? "",
    dataPoints,
  };
}

function extractComparison(raw: unknown): AgentComparisonPayload {
  const record = asRecord(raw);
  const comparison = asRecord(record?.comparisons);

  return {
    hasComparison: Boolean(comparison?.has_comparison),
    comparisonType: asString(comparison?.comparison_type) ?? null,
    headers: Array.isArray(comparison?.headers)
      ? comparison.headers.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0,
        )
      : [],
    rows: Array.isArray(comparison?.rows)
      ? comparison.rows
          .filter((row): row is unknown[] => Array.isArray(row))
          .map((row) =>
            row
              .map((item) => (typeof item === "string" ? item.trim() : ""))
              .filter((item) => item.length > 0),
          )
          .filter((row) => row.length > 0)
      : [],
  };
}

function mapVisualizationPoint(value: unknown): AgentVisualizationPoint | null {
  const record = asRecord(value);
  const timestamp = asString(record?.timestamp);
  const metric = asString(record?.metric);
  const unit = asString(record?.unit);
  const status = asString(record?.status);
  const numericValue = toNumber(record?.value);

  if (!timestamp || !metric || !unit || !status || numericValue === undefined) {
    return null;
  }

  return {
    timestamp,
    metric,
    value: numericValue,
    unit,
    status,
  };
}

function mapDataPoint(value: unknown): Evidence | null {
  const record = asRecord(value);
  if (!record) return null;

  return {
    kind:
      normalizeStatus(record.status) === "patient_context"
        ? "patient_context"
        : "metric_threshold",
    metric: normalizeMetric(record.metric),
    value: toNumber(record.value),
    unit: normalizeUnit(record.unit),
    timestamp: asString(record.timestamp),
    noteKey: asString(record.status),
  };
}

function mapComparisonRow(value: unknown): Evidence | null {
  if (!Array.isArray(value) || value.length < 2) return null;

  return {
    kind: "patient_context",
    noteKey: value
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .join(" · "),
  };
}

function dedupeIssues(
  issues: DashboardIssueId[],
  focusMetrics: string[],
): DashboardIssueId[] {
  const ordered = [...issues];
  for (const metric of focusMetrics) {
    const issue = mapMetricToIssue(metric);
    if (issue) ordered.push(issue);
  }

  return Array.from(new Set(ordered)).slice(0, 3);
}

function inferIssueIds(
  answer: string,
  findings: string[],
  evidence: Evidence[],
): DashboardIssueId[] {
  const text = `${answer} ${findings.join(" ")} ${evidence
    .map((item) => item.noteKey ?? "")
    .join(" ")}`.toLowerCase();
  const issues: DashboardIssueId[] = [];
  const metrics = new Set(evidence.map((item) => item.metric));

  if (
    text.includes("spo2") ||
    text.includes("oxygen") ||
    metrics.has("spo2")
  ) {
    issues.push("spo2");
  }

  if (
    text.includes("blood pressure") ||
    text.includes("systolic") ||
    text.includes("diastolic") ||
    text.includes("huyet ap") ||
    metrics.has("systolic_bp") ||
    metrics.has("diastolic_bp")
  ) {
    issues.push("blood_pressure");
  }

  if (
    text.includes("heart rate") ||
    text.includes("nhip tim") ||
    text.includes("respiratory rate") ||
    text.includes("nhip tho") ||
    text.includes("hrv") ||
    metrics.has("heart_rate") ||
    metrics.has("respiratory_rate")
  ) {
    issues.push("heart_rate");
  }

  return issues.length > 0 ? issues : [];
}

function extractConfidence(raw: unknown, evidence: Evidence[]): AIConfidence {
  const record = asRecord(raw);
  const explicit = record?.confidence ?? record?.confidence_level;

  if (typeof explicit === "string") {
    const normalized = explicit.toLowerCase();
    if (normalized.includes("high")) return "high";
    if (normalized.includes("med")) return "medium";
    if (normalized.includes("low")) return "low";
  }

  if (typeof explicit === "number") {
    if (explicit >= 0.8) return "high";
    if (explicit >= 0.45) return "medium";
    return "low";
  }

  return evidence.length >= 3 ? "high" : evidence.length >= 1 ? "medium" : "low";
}

function extractGeneratedAt(raw: unknown) {
  const record = asRecord(raw);
  return asString(record?.generated_at) ?? new Date().toISOString();
}

function extractSourceId(raw: unknown, title: string) {
  const record = asRecord(raw);
  return asString(record?.source_id) ?? title;
}

function extractResponseType(raw: unknown): AgentResponseType {
  const record = asRecord(raw);
  const responseType = asString(record?.response_type);

  if (
    responseType === "chat" ||
    responseType === "summary" ||
    responseType === "explain-alert"
  ) {
    return responseType;
  }

  return "chat";
}

export function buildThreadTitle(question: string, locale: Locale) {
  const trimmed = question.trim();
  if (!trimmed) {
    return locale === "vi" ? "Đoạn chat mới" : "New chat";
  }

  return trimmed.length > 42 ? `${trimmed.slice(0, 42)}…` : trimmed;
}

function buildEvidenceFinding(evidence: Evidence, locale: Locale) {
  if (evidence.noteKey) {
    return evidence.noteKey;
  }

  if (evidence.metric && typeof evidence.value === "number") {
    const metricLabel = getMetricDisplayLabel(evidence.metric, locale);
    const unit = evidence.unit ? ` ${evidence.unit}` : "";
    return `${metricLabel}: ${evidence.value}${unit}`;
  }

  return locale === "vi"
    ? "Có thêm bằng chứng cần theo dõi."
    : "Additional evidence requires review.";
}

function getMetricDisplayLabel(metric: VitalMetric, locale: Locale) {
  const map: Record<VitalMetric, { vi: string; en: string }> = {
    heart_rate: { vi: "Nhịp tim", en: "Heart rate" },
    respiratory_rate: { vi: "Nhịp thở", en: "Respiratory rate" },
    spo2: { vi: "Oxy máu", en: "SpO₂" },
    systolic_bp: { vi: "Huyết áp tâm thu", en: "Systolic blood pressure" },
    diastolic_bp: { vi: "Huyết áp tâm trương", en: "Diastolic blood pressure" },
  };

  return map[metric][locale];
}

function normalizeIssueId(value: string | undefined): DashboardIssueId | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "spo2" || normalized === "low_oxygen") return "spo2";
  if (
    normalized === "blood_pressure" ||
    normalized === "high_blood_pressure" ||
    normalized === "low_blood_pressure"
  ) {
    return "blood_pressure";
  }
  if (
    normalized === "heart_rate" ||
    normalized === "high_heart_rate" ||
    normalized === "low_heart_rate"
  ) {
    return "heart_rate";
  }
  return null;
}

function mapMetricToIssue(metric: string | undefined): DashboardIssueId | null {
  const normalized = normalizeMetric(metric);
  if (!normalized) return null;
  if (normalized === "spo2") return "spo2";
  if (normalized === "systolic_bp" || normalized === "diastolic_bp") {
    return "blood_pressure";
  }
  if (normalized === "heart_rate" || normalized === "respiratory_rate") {
    return "heart_rate";
  }
  return null;
}

function normalizeMetric(value: unknown): VitalMetric | undefined {
  const metric = asString(value)?.toLowerCase();
  switch (metric) {
    case "heart_rate":
    case "heartrate":
    case "hr":
      return "heart_rate";
    case "hrv_rmssd":
    case "rmssd":
    case "hrv":
    case "respiratory_rate":
    case "respiratoryrate":
    case "rr":
      return "respiratory_rate";
    case "spo2":
    case "oxygen_saturation":
      return "spo2";
    case "systolic_bp":
    case "sbp":
      return "systolic_bp";
    case "diastolic_bp":
    case "dbp":
      return "diastolic_bp";
    default:
      return undefined;
  }
}

function normalizeUnit(value: unknown): Evidence["unit"] {
  const unit = asString(value);
  if (unit === "bpm" || unit === "rpm" || unit === "%" || unit === "mmHg") {
    return unit;
  }

  return undefined;
}

function normalizeStatus(value: unknown): Evidence["kind"] {
  const normalized = asString(value)?.toLowerCase();
  if (
    normalized === "critical" ||
    normalized === "abnormal" ||
    normalized === "warning"
  ) {
    return "metric_threshold";
  }

  return "patient_context";
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asRecord(value: unknown): LooseRecord | null {
  return typeof value === "object" && value !== null ? (value as LooseRecord) : null;
}
```

---

## Ghi chú kiến trúc quan trọng

1. **Streaming là synthetic ở BFF** — Agent HF trả JSON một lần; UX "gõ từng chữ" do BFF chia `narrative_summary` thành chunks 4 từ + `sleep()`.

2. **Muốn true token streaming từ LLM** — Cần backend hỗ trợ SSE/NDJSON thật và BFF `pipe` thay vì `await invokeAgentChat()` blocking.

3. **`onComplete` ghi đè delta** — Sau stream, content bubble = `payload.summary.answer` (đã qua adapter), không phải chuỗi delta tích lũy — đảm bảo markdown chuẩn.

4. **Summary / explain-alert routes** — Cùng pattern: fetch JSON backend → adapt → có thể wrap NDJSON hoặc trả JSON thuần tùy route.
