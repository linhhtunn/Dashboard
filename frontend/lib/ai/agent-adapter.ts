import type { AIConfidence, Evidence, Locale, VitalMetric } from "@/types";
import type {
  AgentChatIntent,
  AgentAction,
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
  const record = asRecord(raw);
  const resolvedPatientId = asString(record?.patient_id ?? record?.patientId) ?? patientId;
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
  const actions = extractActions(raw);

  return {
    title,
    responseType,
    patientId: resolvedPatientId,
    sourceId,
    generatedAt,
    intent,
    suggestedIssueIds,
    recommendedIssueId,
    focusMetrics,
    nextActions,
    summary: {
      patientId: resolvedPatientId,
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
    actions,
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

function extractActions(raw: unknown): AgentAction[] {
  const record = asRecord(raw);
  const actions = Array.isArray(record?.actions) ? record.actions : [];

  return actions
    .map(mapAction)
    .filter((item): item is AgentAction => item !== null)
    .slice(0, 6);
}

function mapAction(value: unknown): AgentAction | null {
  const record = asRecord(value);
  if (!record) return null;

  const type = asString(record.type);
  const label = asString(record.label);
  if (!type || !label) return null;

  const metadata = asRecord(record.metadata);
  return {
    type,
    label,
    patientId: asString(record.patient_id ?? record.patientId),
    hospitalPatientCode: asString(
      record.hospital_patient_code ?? record.hospitalPatientCode,
    ),
    displayName: asString(record.display_name ?? record.displayName),
    metadata: metadata ? { ...metadata } : undefined,
  };
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
