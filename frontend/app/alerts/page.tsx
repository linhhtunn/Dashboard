"use client";

import { useEffect, useState } from "react";

import { AlertAIChatPanel } from "@/components/alerts/AlertAIChatPanel";
import { AlertZonePanel } from "@/components/alerts/AlertZonePanel";
import { ClinicalShell } from "@/components/clinical/ClinicalShell";
import { useLocale } from "@/components/providers/LocaleProvider";
import {
  defaultAlertZoneFilters,
  type AlertZoneFilters,
} from "@/lib/alerts-filters";
import { alertRepository } from "@/lib/repositories/alert.repository";
import { patientRepository } from "@/lib/repositories/patient.repository";
import type { Alert, Patient } from "@/types";

export default function AlertsPage() {
  const { locale } = useLocale();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [patients, setPatients] = useState<Record<string, Patient>>({});
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [criticalFilters, setCriticalFilters] =
    useState<AlertZoneFilters>(defaultAlertZoneFilters);
  const [warningFilters, setWarningFilters] =
    useState<AlertZoneFilters>(defaultAlertZoneFilters);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void alertRepository
      .list()
      .then(async (nextAlerts) => {
        if (cancelled) return;
        setAlerts(nextAlerts);
        const entries = await Promise.all(
          Array.from(new Set(nextAlerts.map((alert) => alert.patientId))).map(
            async (id) => [id, await patientRepository.findById(id)] as const,
          ),
        );
        if (cancelled) return;
        setPatients(
          Object.fromEntries(
            entries.filter(
              (entry): entry is readonly [string, Patient] => Boolean(entry[1]),
            ),
          ),
        );
      })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : locale === "vi"
                ? "Không thể tải lịch sử cảnh báo."
                : "Unable to load alert history.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const aiPanelOpen = selectedAlert !== null;

  return (
    <ClinicalShell
      viewportLocked
      eyebrow={locale === "vi" ? "Rà soát không thời gian thực" : "Non-realtime review"}
      title={locale === "vi" ? "Lịch sử cảnh báo" : "Alert history"}
      description={
        locale === "vi"
          ? "Hai zone theo mức độ nghiêm trọng, mỗi zone có bộ lọc riêng."
          : "Two severity zones, each with its own filters."
      }
    >
      {loading ? (
        <div className="dashboard-surface flex flex-1 items-center justify-center rounded-[1.15rem] px-4 py-8 text-center text-[13px] text-[color:var(--cs-text-soft)]">
          {locale === "vi" ? "Đang tải cảnh báo..." : "Loading alerts..."}
        </div>
      ) : error ? (
        <div className="dashboard-surface flex flex-1 items-center justify-center rounded-[1.15rem] px-4 py-8 text-center text-[13px] text-[color:var(--cs-danger)]">
          {error}
        </div>
      ) : (
        <div
          className={[
            "grid min-h-0 flex-1 gap-3 overflow-hidden transition-all duration-300",
            aiPanelOpen
              ? "lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_420px]"
              : "grid-cols-1",
          ].join(" ")}
        >
          <div
            className={[
              "grid min-h-0 gap-3 overflow-hidden",
              aiPanelOpen
                ? "max-lg:grid-rows-2 lg:grid-cols-2"
                : "max-lg:grid-rows-2 lg:grid-cols-2",
            ].join(" ")}
          >
            <AlertZonePanel
              title={
                locale === "vi" ? "Cảnh báo nghiêm trọng" : "Critical alerts"
              }
              bucket="critical"
              alerts={alerts}
              patients={patients}
              resolvedIds={resolvedIds}
              filters={criticalFilters}
              onFiltersChange={setCriticalFilters}
              onResolve={(alertId) =>
                setResolvedIds((current) =>
                  current.includes(alertId) ? current : [...current, alertId],
                )
              }
              onAskAI={setSelectedAlert}
            />
            <AlertZonePanel
              title={locale === "vi" ? "Cảnh báo" : "Warnings"}
              bucket="warning"
              alerts={alerts}
              patients={patients}
              resolvedIds={resolvedIds}
              filters={warningFilters}
              onFiltersChange={setWarningFilters}
              onResolve={(alertId) =>
                setResolvedIds((current) =>
                  current.includes(alertId) ? current : [...current, alertId],
                )
              }
              onAskAI={setSelectedAlert}
            />
          </div>

          <aside
            className={[
              "min-h-0 min-w-0 overflow-hidden transition-all duration-300",
              aiPanelOpen
                ? "translate-x-0 opacity-100 max-lg:fixed max-lg:inset-x-3 max-lg:bottom-3 max-lg:top-[7.5rem] max-lg:z-40"
                : "pointer-events-none w-0 translate-x-8 opacity-0",
            ].join(" ")}
          >
            {selectedAlert ? (
              <AlertAIChatPanel
                alert={selectedAlert}
                patient={patients[selectedAlert.patientId]}
                onClose={() => setSelectedAlert(null)}
              />
            ) : null}
          </aside>
        </div>
      )}
    </ClinicalShell>
  );
}
