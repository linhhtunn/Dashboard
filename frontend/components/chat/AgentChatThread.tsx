"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Table2 } from "lucide-react";

import {
  AssistantTextBubble,
  ThinkingBlock,
  UserPromptBubble,
} from "@/components/chat/ChatBubbles";
import { AgentErrorBanner } from "@/components/chat/AgentErrorBanner";
import { classifyAgentAnswer } from "@/lib/ai/agent-fallback";
import { formatShortClockTime, getMetricLabel } from "@/lib/i18n";
import type {
  AgentAction,
  AgentChatThreadMessage,
  AgentInsightPayload,
} from "@/lib/ai/types";
import type { Locale } from "@/types";
import type { VitalMetric } from "@/types";

type AgentChatThreadProps = {
  messages: AgentChatThreadMessage[];
  locale: Locale;
  patientId?: string;
  thinkingLabel: string;
  streamingMessageId?: string | null;
  size?: "default" | "compact";
  emptyState?: React.ReactNode;
  className?: string;
};

export function AgentChatThread({
  messages,
  locale,
  patientId,
  thinkingLabel,
  streamingMessageId = null,
  size = "compact",
  emptyState,
  className = "",
}: AgentChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamingMessageId]);

  return (
    <div
      ref={scrollRef}
      className={["dashboard-scroll-area space-y-3 overflow-y-auto", className].join(
        " ",
      )}
    >
      {emptyState && messages.length === 0 ? emptyState : null}

      {messages.map((message) => {
        if (message.role === "user") {
          return (
            <UserPromptBubble
              key={message.id}
              prompt={message.content}
              size={size}
            />
          );
        }

        const isStreaming = streamingMessageId === message.id && !message.content;
        if (isStreaming) {
          return (
            <ThinkingBlock key={message.id} label={thinkingLabel} size={size} />
          );
        }

        if (!message.content) {
          return (
            <ThinkingBlock key={message.id} label={thinkingLabel} size={size} />
          );
        }

        const fallbackKind =
          message.fallbackKind ??
          (message.isError
            ? "generic"
            : classifyAgentAnswer(message.content));

        if (fallbackKind && !message.isError) {
          if (
            fallbackKind === "patient_not_found" ||
            fallbackKind === "safe_response"
          ) {
            return (
              <AgentErrorBanner
                key={message.id}
                kind={fallbackKind}
                locale={locale}
                patientId={patientId}
              />
            );
          }
        }

        if (message.isError) {
          return (
            <AgentErrorBanner
              key={message.id}
              kind={fallbackKind ?? "generic"}
              locale={locale}
              patientId={patientId}
            />
          );
        }

        return (
          <div key={message.id} className="space-y-2">
            <AssistantTextBubble
              content={message.content}
              size={size}
              isStreaming={streamingMessageId === message.id}
            />
            {message.payload ? (
              <AgentPayloadBlocks payload={message.payload} locale={locale} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function AgentPayloadBlocks({
  payload,
  locale,
}: {
  payload: AgentInsightPayload;
  locale: Locale;
}) {
  const hasActions = payload.actions.length > 0;
  const hasChart =
    payload.visualization.hasChart && payload.visualization.dataPoints.length > 0;
  const hasComparison =
    payload.comparison.hasComparison && payload.comparison.rows.length > 0;

  if (!hasActions && !hasChart && !hasComparison) return null;

  return (
    <div className="ml-0 space-y-2 sm:ml-10">
      {hasActions ? (
        <div className="grid gap-1.5">
          {payload.actions.map((action, index) => (
            <AgentActionButton
              key={`${action.type}-${action.patientId ?? index}`}
              action={action}
              locale={locale}
            />
          ))}
        </div>
      ) : null}

      {hasChart ? (
        <div className="rounded-[0.9rem] border border-[color:rgba(13,71,161,0.12)] bg-white/58 p-2.5">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-[color:var(--cs-heading)]">
            <BarChart3 className="h-3.5 w-3.5 text-[color:var(--cs-primary)]" />
            {payload.visualization.chartTitle ||
              (locale === "vi" ? "Chỉ số liên quan" : "Related metrics")}
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {payload.visualization.dataPoints.slice(0, 4).map((point) => (
              <div
                key={`${point.metric}-${point.timestamp}`}
                className="rounded-[0.7rem] bg-white/72 px-2.5 py-2"
              >
                <p className="text-[10px] font-semibold text-[color:var(--cs-text-soft)]">
                  {getMetricLabel(normalizeMetric(point.metric), locale)}
                </p>
                <p className="text-[13px] font-semibold text-[color:var(--cs-primary)]">
                  {point.value}{" "}
                  <span className="text-[10px] font-normal text-[color:var(--cs-text-soft)]">
                    {point.unit}
                  </span>
                </p>
                <p className="text-[10px] text-[color:var(--cs-text-soft)]">
                  {formatShortClockTime(point.timestamp, locale)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {hasComparison ? (
        <div className="overflow-hidden rounded-[0.9rem] border border-[color:rgba(13,71,161,0.12)] bg-white/58">
          <div className="flex items-center gap-1.5 border-b border-white/70 px-2.5 py-2 text-[11px] font-semibold text-[color:var(--cs-heading)]">
            <Table2 className="h-3.5 w-3.5 text-[color:var(--cs-primary)]" />
            {locale === "vi" ? "Bảng so sánh" : "Comparison"}
          </div>
          {payload.comparison.rows.slice(0, 4).map((row, index) => (
            <div
              key={`${row.join("-")}-${index}`}
              className="grid gap-2 border-b border-white/60 px-2.5 py-2 text-[11px] text-[color:var(--cs-text)] last:border-b-0"
              style={{
                gridTemplateColumns: `repeat(${Math.max(row.length, 1)}, minmax(0, 1fr))`,
              }}
            >
              {row.map((cell) => (
                <span key={cell}>{cell}</span>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AgentActionButton({
  action,
  locale,
}: {
  action: AgentAction;
  locale: Locale;
}) {
  const label = action.displayName
    ? `${action.label}: ${action.displayName}`
    : action.label;

  if (action.type === "select_patient_for_chat" && action.patientId) {
    return (
      <Link
        href={`/patients/${action.patientId}`}
        className="inline-flex items-center justify-between gap-2 rounded-[0.75rem] border border-[color:rgba(13,71,161,0.16)] bg-white/72 px-3 py-2 text-[11px] font-semibold text-[color:var(--cs-primary)] transition hover:bg-white"
      >
        <span>
          {label}
          {action.hospitalPatientCode ? ` · ${action.hospitalPatientCode}` : ""}
        </span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    );
  }

  return (
    <div className="rounded-[0.75rem] border border-[color:rgba(13,71,161,0.12)] bg-white/58 px-3 py-2 text-[11px] text-[color:var(--cs-text)]">
      {label || (locale === "vi" ? "Hành động từ agent" : "Agent action")}
    </div>
  );
}

function normalizeMetric(metric: string): VitalMetric {
  switch (metric.toLowerCase()) {
    case "hr":
    case "heart_rate":
      return "heart_rate";
    case "hrv":
    case "rmssd":
    case "hrv_rmssd":
    case "respiratory_rate":
    case "respiratoryrate":
    case "rr":
      return "respiratory_rate";
    case "spo2":
      return "spo2";
    case "sbp":
    case "systolic_bp":
      return "systolic_bp";
    case "dbp":
    case "diastolic_bp":
      return "diastolic_bp";
    default:
      return "heart_rate";
  }
}
