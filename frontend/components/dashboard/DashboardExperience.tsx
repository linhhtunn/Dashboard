"use client";

import { useEffect, useMemo, useState } from "react";

import { AIWorkspacePanel } from "@/components/dashboard/AIWorkspacePanel";
import {
  dashboardMetrics,
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
import { normalizePatientId } from "@/lib/patient-id";
import { patientRepository } from "@/lib/repositories/patient.repository";
import { vitalRepository } from "@/lib/repositories/vital.repository";
import type { ThreadMessage, ThreadMeta } from "@/lib/ai/types";
import { formatShortClockTime, localizeText } from "@/lib/i18n";
import type { MetricSummary, Patient } from "@/types";

export type SidebarHistoryItem = {
  id: string;
  title: string;
  timestamp: string;
  issue: string;
};

const DEMO_USER_ID = "clinician-local";
const DASHBOARD_REFRESH_MS = 15000;
const DEFAULT_PATIENT_ID = normalizePatientId(dashboardPatient.id);

function buildFallbackPatient(patientId: string): Patient {
  return {
    ...dashboardPatient,
    id: patientId,
    name: patientId === DEFAULT_PATIENT_ID ? dashboardPatient.name : `Patient ${patientId}`,
  };
}

export function DashboardExperience() {
  const { locale } = useLocale();
  const [activeIssueId, setActiveIssueId] = useState<IssueId | null>(null);
  const [patientPanelOpen, setPatientPanelOpen] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState(createThreadId());
  const [currentPatientId, setCurrentPatientId] = useState(DEFAULT_PATIENT_ID);
  const [hasConversation, setHasConversation] = useState(false);
  const [storedThreads, setStoredThreads] = useState<ThreadMeta[]>([]);
  const [initialMessages, setInitialMessages] = useState<ThreadMessage[]>([]);
  const [contextPatient, setContextPatient] = useState<Patient>(dashboardPatient);
  const [contextMetrics, setContextMetrics] = useState<MetricSummary[]>(dashboardMetrics);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    const loadThreads = async () => {
      try {
        const threads = await listThreadMeta(currentPatientId, DEMO_USER_ID);
        if (cancelled) return;
        setStoredThreads(threads);
      } catch {
        if (cancelled) return;
        setStoredThreads([]);
      }
    };

    void loadThreads();
    intervalId = window.setInterval(() => {
      void loadThreads();
    }, DASHBOARD_REFRESH_MS);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [currentPatientId]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    const loadPatientContext = async () => {
      try {
        const [patient, snapshot] = await Promise.all([
          patientRepository.findById(currentPatientId),
          vitalRepository.getSnapshot(currentPatientId),
        ]);
        if (cancelled) return;

        setContextPatient(
          patient ?? buildFallbackPatient(currentPatientId),
        );
        setContextMetrics(
          snapshot.metricSummaries.length > 0 ? snapshot.metricSummaries : dashboardMetrics,
        );
      } catch {
        if (cancelled) return;
        setContextPatient((current) =>
          current.id === currentPatientId
            ? current
            : buildFallbackPatient(currentPatientId),
        );
        setContextMetrics(dashboardMetrics);
      }
    };

    void loadPatientContext();
    intervalId = window.setInterval(() => {
      void loadPatientContext();
    }, DASHBOARD_REFRESH_MS);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [currentPatientId]);

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
    const nextThreads = await listThreadMeta(currentPatientId, DEMO_USER_ID);
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
    setCurrentPatientId(DEFAULT_PATIENT_ID);
    setContextPatient(buildFallbackPatient(DEFAULT_PATIENT_ID));
    setContextMetrics(dashboardMetrics);
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
    if (detail?.meta.patientId && detail.meta.patientId !== "GENERAL") {
      setCurrentPatientId(detail.meta.patientId);
      setContextPatient(buildFallbackPatient(detail.meta.patientId));
      setContextMetrics(dashboardMetrics);
    }
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
          key={`${locale}-${currentThreadId}-${initialMessages.length}-${initialMessages.at(-1)?.content ?? "empty"}`}
          activeIssueId={activeIssueId}
          currentThreadId={currentThreadId}
          initialMessages={initialMessages}
          patientId={currentPatientId}
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
            patient={contextPatient}
            metrics={contextMetrics}
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
