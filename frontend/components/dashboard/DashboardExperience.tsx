"use client";

import { useMemo, useState } from "react";

import { AIWorkspacePanel } from "@/components/dashboard/AIWorkspacePanel";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import {
  dashboardIssues,
  type IssueId,
} from "@/components/dashboard/dashboard-demo-data";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { PatientContextPanel } from "@/components/dashboard/PatientContextPanel";
import { useLocale } from "@/components/providers/LocaleProvider";
import { formatShortClockTime, localizeText } from "@/lib/i18n";

export type SidebarHistoryItem = {
  id: string;
  title: string;
  timestamp: string;
  issue: string;
};

export function DashboardExperience() {
  const { locale } = useLocale();
  const [activeIssueId, setActiveIssueId] = useState<IssueId | null>(null);
  const [patientPanelOpen, setPatientPanelOpen] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(0);
  const [hasConversation, setHasConversation] = useState(false);
  const [sessionHistoryItems, setSessionHistoryItems] = useState<
    SidebarHistoryItem[]
  >([]);

  const historyItems = useMemo(
    () => [...sessionHistoryItems, ...buildInitialHistory(locale)],
    [locale, sessionHistoryItems],
  );

  const activeIssue = useMemo(
    () => dashboardIssues.find((issue) => issue.id === activeIssueId) ?? null,
    [activeIssueId],
  );

  const handleToggleIssue = (issueId: IssueId) => {
    setActiveIssueId((current) => {
      const nextIssueId = current === issueId ? null : issueId;
      setPatientPanelOpen(nextIssueId !== null);
      return nextIssueId;
    });
  };

  const handleOpenIssue = (issueId: IssueId) => {
    setActiveIssueId(issueId);
    setPatientPanelOpen(true);
  };

  const handleClosePatientPanel = () => {
    setPatientPanelOpen(false);
  };

  const handleCreateNewChat = () => {
    setChatSessionId((current) => current + 1);
    setActiveIssueId(null);
    setPatientPanelOpen(false);
    setHasConversation(false);
    setSessionHistoryItems([]);
  };

  const handleStartConversation = (prompt: string) => {
    setHasConversation(true);
    setSessionHistoryItems((current) => [
      {
        id: `history-${Date.now()}`,
        title: prompt.length > 34 ? `${prompt.slice(0, 34)}…` : prompt,
        timestamp: formatShortClockTime(new Date(), locale),
        issue: localizeText(deriveIssueLabel(prompt), locale),
      },
      ...current,
    ]);
  };

  return (
    <DashboardShell
      activeNav="dashboard"
      patientPanelOpen={patientPanelOpen}
      historyItems={historyItems}
      historyDisabled={!hasConversation}
      onCreateNewChat={handleCreateNewChat}
      topBar={<DashboardTopBar />}
      leftPanel={
        <AIWorkspacePanel
          key={`${locale}-${chatSessionId}`}
          sessionId={chatSessionId}
          activeIssueId={activeIssueId}
          onConversationStateChange={setHasConversation}
          onOpenIssue={handleOpenIssue}
          onStartConversation={handleStartConversation}
          onToggleIssue={handleToggleIssue}
        />
      }
      rightPanel={
        activeIssue ? (
          <PatientContextPanel
            activeIssue={activeIssue}
            onClose={handleClosePatientPanel}
          />
        ) : null
      }
    />
  );
}

function buildInitialHistory(locale: "vi" | "en"): SidebarHistoryItem[] {
  return [
    {
      id: "history-1",
      title: locale === "vi" ? "Tóm tắt ca đêm" : "Night shift summary",
      timestamp: "08:20",
      issue: locale === "vi" ? "SpO₂ thấp" : "Low SpO₂",
    },
    {
      id: "history-2",
      title:
        locale === "vi" ? "Đánh giá tác động thuốc" : "Medication impact review",
      timestamp: "07:10",
      issue: locale === "vi" ? "Huyết áp" : "Blood pressure",
    },
    {
      id: "history-3",
      title:
        locale === "vi"
          ? "Rà soát nguy cơ diễn tiến xấu"
          : "Review deterioration risk",
      timestamp: locale === "vi" ? "Hôm qua" : "Yesterday",
      issue: "HRV - RMSSD",
    },
  ];
}

function deriveIssueLabel(prompt: string) {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes("spo2") || lowerPrompt.includes("oxy")) {
    return { vi: "SpO₂ thấp", en: "Low SpO₂" };
  }

  if (
    lowerPrompt.includes("huyết áp") ||
    lowerPrompt.includes("blood pressure")
  ) {
    return { vi: "Huyết áp", en: "Blood pressure" };
  }

  if (
    lowerPrompt.includes("nhịp tim") ||
    lowerPrompt.includes("heart rate") ||
    lowerPrompt.includes("hrv")
  ) {
    return { vi: "Nhịp tim", en: "Heart rate" };
  }

  return { vi: "Theo dõi tổng quát", en: "General monitoring" };
}
