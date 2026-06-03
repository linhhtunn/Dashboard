"use client";

import { useMemo, useState } from "react";

import { AIWorkspacePanel } from "@/components/dashboard/AIWorkspacePanel";
import {
  dashboardIssues,
  type IssueId,
} from "@/components/dashboard/dashboard-demo-data";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { PatientContextPanel } from "@/components/dashboard/PatientContextPanel";

export type SidebarHistoryItem = {
  id: string;
  title: string;
  timestamp: string;
  issue: string;
};

const initialHistory: SidebarHistoryItem[] = [
  {
    id: "history-1",
    title: "Tóm tắt ca đêm",
    timestamp: "08:20",
    issue: "SpO₂ thấp",
  },
  {
    id: "history-2",
    title: "Đánh giá tác động thuốc",
    timestamp: "07:10",
    issue: "Huyết áp",
  },
  {
    id: "history-3",
    title: "Rà soát nguy cơ diễn tiến xấu",
    timestamp: "Hôm qua",
    issue: "HRV - RMSSD",
  },
];

function formatNowLabel() {
  const now = new Date();
  return now.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function deriveIssueLabel(prompt: string) {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes("spo2") || lowerPrompt.includes("oxy")) {
    return "SpO₂ thấp";
  }

  if (lowerPrompt.includes("huyết áp")) {
    return "Huyết áp";
  }

  if (lowerPrompt.includes("nhịp tim") || lowerPrompt.includes("hrv")) {
    return "Nhịp tim";
  }

  return "Theo dõi tổng quát";
}

export function DashboardExperience() {
  const [activeIssueId, setActiveIssueId] = useState<IssueId | null>(null);
  const [patientPanelOpen, setPatientPanelOpen] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(0);
  const [hasConversation, setHasConversation] = useState(false);
  const [historyItems, setHistoryItems] =
    useState<SidebarHistoryItem[]>(initialHistory);

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
  };

  const handleStartConversation = (prompt: string) => {
    setHasConversation(true);
    setHistoryItems((current) => [
      {
        id: `history-${Date.now()}`,
        title: prompt.length > 34 ? `${prompt.slice(0, 34)}…` : prompt,
        timestamp: formatNowLabel(),
        issue: deriveIssueLabel(prompt),
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
            onToggleIssue={handleToggleIssue}
          />
        ) : null
      }
    />
  );
}
