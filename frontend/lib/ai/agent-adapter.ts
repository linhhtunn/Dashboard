import type {
  AIConfidence,
  Evidence,
  Locale,
  VitalMetric,
} from "@/types";
import type {
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
  const suggestedIssueIds = inferIssueIds(answer, keyFindings, evidence);
  const confidence = extractConfidence(raw, evidence);
  const generatedAt = extractGeneratedAt(raw);
  const visualization = extractVisualization(raw);
  const comparison = extractComparison(raw);
  const responseType = extractResponseType(raw);
  const sourceId = extractSourceId(raw, title);

  return {
    title,
    responseType,
    patientId,
    sourceId,
    generatedAt,
    suggestedIssueIds,
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
    ? "Backend AI chưa trả về phần tóm tắt có thể đọc được."
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
      .slice(0, 3);

    if (normalized.length > 0) return normalized;
  }

  if (evidence.length > 0) {
    return evidence.slice(0, 3).map((item) => buildEvidenceFinding(item, locale));
  }

  const fallback = answer
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  return fallback.length > 0
    ? fallback
    : [
        locale === "vi"
          ? "Cần rà soát thêm phản hồi gốc từ AI."
          : "Further review of the raw AI response is needed.",
      ];
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

  return evidence.slice(0, 6);
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
    text.includes("spo₂") ||
    text.includes("oxygen") ||
    metrics.has("spo2")
  ) {
    issues.push("spo2");
  }

  if (
    text.includes("blood pressure") ||
    text.includes("systolic") ||
    text.includes("diastolic") ||
    text.includes("huyết áp") ||
    metrics.has("systolic_bp") ||
    metrics.has("diastolic_bp")
  ) {
    issues.push("blood_pressure");
  }

  if (
    text.includes("heart rate") ||
    text.includes("nhịp tim") ||
    text.includes("hrv") ||
    metrics.has("heart_rate") ||
    metrics.has("hrv_rmssd")
  ) {
    issues.push("heart_rate");
  }

  return issues.length > 0 ? issues : ["spo2"];
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
    hrv_rmssd: { vi: "HRV - RMSSD", en: "HRV - RMSSD" },
    spo2: { vi: "SpO₂", en: "SpO₂" },
    systolic_bp: { vi: "Huyết áp tâm thu", en: "Systolic blood pressure" },
    diastolic_bp: { vi: "Huyết áp tâm trương", en: "Diastolic blood pressure" },
  };

  return map[metric][locale];
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
      return "hrv_rmssd";
    case "spo2":
    case "spo₂":
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
  if (unit === "bpm" || unit === "ms" || unit === "%" || unit === "mmHg") {
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
