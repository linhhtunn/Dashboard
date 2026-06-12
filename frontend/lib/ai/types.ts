import type { AskAIRequest, AskAIResponse } from "@/types";

export type DashboardIssueId = "spo2" | "blood_pressure" | "heart_rate";
export type AgentResponseType = "chat" | "summary" | "explain-alert";
export type AgentChatIntent =
  | "general_chat"
  | "patient_summary"
  | "patient_metric_or_protocol";

export type AgentVisualizationPoint = {
  timestamp: string;
  metric: string;
  value: number;
  unit: string;
  status: string;
};

export type AgentVisualizationPayload = {
  hasChart: boolean;
  chartType: string;
  chartTitle: string;
  dataPoints: AgentVisualizationPoint[];
};

export type AgentComparisonPayload = {
  hasComparison: boolean;
  comparisonType: string | null;
  headers: string[];
  rows: string[][];
};

export type AgentInsightPayload = {
  title: string;
  responseType: AgentResponseType;
  patientId: string;
  sourceId: string;
  generatedAt: string;
  intent: AgentChatIntent;
  suggestedIssueIds: DashboardIssueId[];
  recommendedIssueId: DashboardIssueId | null;
  focusMetrics: string[];
  nextActions: string[];
  summary: AskAIResponse;
  visualization: AgentVisualizationPayload;
  comparison: AgentComparisonPayload;
};

export type AgentChatProxyRequest = AskAIRequest & {
  threadId: string;
  userId: string;
  message: string;
  metadata?: {
    alert_id?: string;
    [key: string]: unknown;
  };
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
};

export type AgentSummaryProxyRequest = {
  patientId: string;
  locale: AskAIRequest["locale"];
};

export type AgentExplainAlertProxyRequest = {
  alertId: string;
  patientId: string;
  locale: AskAIRequest["locale"];
};

export type AgentChatProxyPayload = AgentInsightPayload & {
  threadId: string;
};

export type AgentChatStreamEvent =
  | {
      type: "meta";
      threadId: string;
      title: string;
      suggestedIssueIds: DashboardIssueId[];
    }
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "complete";
      payload: AgentChatProxyPayload;
    };

export type ThreadMeta = {
  threadId: string;
  patientId: string;
  title: string;
  updatedAt: string;
  lastIssue: string;
};

export type ThreadMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ThreadDetail = {
  meta: ThreadMeta;
  messages: ThreadMessage[];
};
