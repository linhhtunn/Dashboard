"use client";

import { useMemo, useState } from "react";

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
import { MVP_BACKEND_PATIENT_ID } from "@/lib/ai/mvp-demo";
import {
  createThreadId,
  listThreadMeta,
  upsertThreadMeta,
} from "@/lib/ai/thread-store";
import type { ThreadMeta } from "@/lib/ai/types";
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
  const [currentThreadTitle, setCurrentThreadTitle] = useState<string | null>(null);
  const [hasConversation, setHasConversation] = useState(false);
  const [storedThreads, setStoredThreads] = useState<ThreadMeta[]>(() =>
    listThreadMeta(dashboardPatient.id),
  );

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
    setCurrentThreadTitle(null);
    setActiveIssueId(null);
    setPatientPanelOpen(false);
    setHasConversation(false);
  };

  const handlePersistThread = (meta: { title: string; lastIssue: string }) => {
    setHasConversation(true);
    const nextMeta: ThreadMeta = {
      threadId: currentThreadId,
      patientId: dashboardPatient.id,
      title: meta.title,
      updatedAt: new Date().toISOString(),
      lastIssue: meta.lastIssue,
    };

    setCurrentThreadTitle(meta.title);
    upsertThreadMeta(nextMeta);
    setStoredThreads(listThreadMeta(dashboardPatient.id));
  };

  const handleSelectThread = (threadId: string) => {
    const selected = storedThreads.find((item) => item.threadId === threadId);
    setCurrentThreadId(threadId);
    setCurrentThreadTitle(selected?.title ?? null);
    setHasConversation(true);
    setActiveIssueId(null);
    setPatientPanelOpen(false);
  };

  return (
    <DashboardShell
      activeNav="dashboard"
      activeThreadId={currentThreadId}
      historyItems={historyItems}
      historyDisabled={!hasConversation && storedThreads.length === 0}
      onCreateNewChat={handleCreateNewChat}
      onSelectThread={handleSelectThread}
      patientPanelOpen={patientPanelOpen}
      topBar={<DashboardTopBar />}
      leftPanel={
        <AIWorkspacePanel
          key={`${locale}-${currentThreadId}`}
          activeIssueId={activeIssueId}
          currentThreadId={currentThreadId}
          patientId={MVP_BACKEND_PATIENT_ID}
          resumeThreadTitle={currentThreadTitle}
          userId={DEMO_USER_ID}
          onConversationStateChange={setHasConversation}
          onOpenIssue={handleOpenIssue}
          onPersistThread={handlePersistThread}
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
