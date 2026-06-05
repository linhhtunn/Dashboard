"use client";

import { useEffect, useMemo, useState } from "react";

import { AIWorkspacePanel } from "@/components/dashboard/AIWorkspacePanel";
import {
  dashboardIssues,
  dashboardPatient,
  type IssueId,
} from "@/components/dashboard/dashboard-demo-data";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { PatientContextPanel } from "@/components/dashboard/PatientContextPanel";
import { useLocale } from "@/components/providers/LocaleProvider";
import {
  createThreadId,
  getThreadDetail,
  listThreadMeta,
} from "@/lib/ai/thread-store";
import type { ThreadMessage, ThreadMeta } from "@/lib/ai/types";
import { formatShortClockTime, localizeText } from "@/lib/i18n";

export type SidebarHistoryItem = {
  id: string;
  title: string;
  timestamp: string;
  issue: string;
};

const DEMO_USER_ID = "clinician-local";

export function DashboardExperience() {
  const { locale } = useLocale();
  const [activeIssueId, setActiveIssueId] = useState<IssueId | null>(null);
  const [patientPanelOpen, setPatientPanelOpen] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState(createThreadId());
  const [hasConversation, setHasConversation] = useState(false);
  const [storedThreads, setStoredThreads] = useState<ThreadMeta[]>([]);
  const [initialMessages, setInitialMessages] = useState<ThreadMessage[]>([]);

  useEffect(() => {
    let cancelled = false;

    void listThreadMeta(dashboardPatient.id, DEMO_USER_ID)
      .then((threads) => {
        if (cancelled) return;
        setStoredThreads(threads);
      })
      .catch(() => {
        if (cancelled) return;
        setStoredThreads([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const historyItems = useMemo(
    () =>
      storedThreads.map((item) => ({
        id: item.threadId,
        title: item.title,
        timestamp: formatShortClockTime(item.updatedAt, locale),
        issue: item.lastIssue,
      })),
    [locale, storedThreads],
  );

  const activeIssue = useMemo(
    () => dashboardIssues.find((issue) => issue.id === activeIssueId) ?? null,
    [activeIssueId],
  );

  const refreshThreads = async () => {
    const nextThreads = await listThreadMeta(dashboardPatient.id, DEMO_USER_ID);
    setStoredThreads(nextThreads);
  };

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
    setCurrentThreadId(createThreadId());
    setInitialMessages([]);
    setActiveIssueId(null);
    setPatientPanelOpen(false);
    setHasConversation(false);
  };

  const handleThreadUpdated = async () => {
    await refreshThreads();
  };

  const handleSelectThread = async (threadId: string) => {
    setCurrentThreadId(threadId);
    setActiveIssueId(null);
    setPatientPanelOpen(false);

    const detail = await getThreadDetail(threadId);
    setInitialMessages(detail?.messages ?? []);
    setHasConversation((detail?.messages.length ?? 0) > 0);
  };

  return (
    <DashboardShell
      activeNav="dashboard"
      activeThreadId={currentThreadId}
      historyItems={historyItems}
      historyDisabled={!hasConversation}
      onCreateNewChat={handleCreateNewChat}
      onSelectThread={(threadId) => {
        void handleSelectThread(threadId);
      }}
      patientPanelOpen={patientPanelOpen}
      topBar={<DashboardTopBar />}
      leftPanel={
        <AIWorkspacePanel
          key={`${locale}-${currentThreadId}`}
          activeIssueId={activeIssueId}
          currentThreadId={currentThreadId}
          initialMessages={initialMessages}
          patientId={dashboardPatient.id}
          userId={DEMO_USER_ID}
          onConversationStateChange={setHasConversation}
          onOpenIssue={handleOpenIssue}
          onThreadUpdated={handleThreadUpdated}
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

export function getIssueLabel(issueId: IssueId, locale: "vi" | "en") {
  const issue = dashboardIssues.find((item) => item.id === issueId);
  return localizeText(issue?.chipLabel ?? issue?.title, locale, issueId);
}
