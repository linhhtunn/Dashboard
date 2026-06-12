"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AlertAIChatPanel } from "@/components/alerts/AlertAIChatPanel";
import { AlertTreatmentModal } from "@/components/alerts/AlertTreatmentModal";
import { AlertZonePanel } from "@/components/alerts/AlertZonePanel";
import { DoctorConfirmBanner } from "@/components/alerts/DoctorConfirmBanner";
import { DoctorConfirmModal } from "@/components/alerts/DoctorConfirmModal";
import { ClinicalShell } from "@/components/clinical/ClinicalShell";
import {
  defaultAlertZoneFilters,
  isAwaitingDoctor,
  type AlertZoneFilters,
} from "@/lib/alerts-filters";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import { useOperatorRole } from "@/lib/operator-role";
import { alertRepository } from "@/lib/repositories/alert.repository";
import { patientRepository } from "@/lib/repositories/patient.repository";
import { shiftRepository } from "@/lib/repositories/shift.repository";
import type { Alert, Patient, ShiftStaffMember } from "@/types";

export default function AlertsPage() {
  const ui = useClinicalUi();
  const { role: operatorRole } = useOperatorRole();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [patients, setPatients] = useState<Record<string, Patient>>({});
  const [floorNurses, setFloorNurses] = useState<ShiftStaffMember[]>([]);
  const [criticalFilters, setCriticalFilters] =
    useState<AlertZoneFilters>(defaultAlertZoneFilters);
  const [warningFilters, setWarningFilters] =
    useState<AlertZoneFilters>(defaultAlertZoneFilters);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [treatmentAlert, setTreatmentAlert] = useState<Alert | null>(null);
  const [confirmAlert, setConfirmAlert] = useState<Alert | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [nextAlerts, staff] = await Promise.all([
      alertRepository.list(),
      shiftRepository.listStaff(),
    ]);
    setAlerts(nextAlerts);
    setFloorNurses(staff.filter((member) => member.role === "floor_nurse"));
    const entries = await Promise.all(
      Array.from(new Set(nextAlerts.map((alert) => alert.patientId))).map(
        async (id) => [id, await patientRepository.findById(id)] as const,
      ),
    );
    setPatients(
      Object.fromEntries(
        entries.filter(
          (entry): entry is readonly [string, Patient] => Boolean(entry[1]),
        ),
      ),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadData()
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : ui.alerts.loadError,
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadData, ui.alerts.loadError]);

  const pendingDoctorAlerts = useMemo(
    () => alerts.filter(isAwaitingDoctor),
    [alerts],
  );

  const aiPanelOpen = selectedAlert !== null;

  async function refreshAfterAction() {
    const nextAlerts = await alertRepository.list();
    setAlerts(nextAlerts);
    setTreatmentAlert(null);
    setConfirmAlert(null);
  }

  return (
    <ClinicalShell
      viewportLocked
      eyebrow={ui.alerts.eyebrow}
      title={ui.alerts.title}
      description={ui.alerts.description}
    >
      {loading ? (
        <div className="dashboard-surface flex flex-1 items-center justify-center rounded-[1.15rem] px-4 py-8 text-center text-[13px] text-[color:var(--cs-text-soft)]">
          {ui.common.loading}
        </div>
      ) : error ? (
        <div className="dashboard-surface flex flex-1 items-center justify-center rounded-[1.15rem] px-4 py-8 text-center text-[13px] text-[color:var(--cs-danger)]">
          {error}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          {operatorRole === "doctor" ? (
            <DoctorConfirmBanner
              pendingAlerts={pendingDoctorAlerts}
              patients={patients}
              onConfirm={setConfirmAlert}
            />
          ) : null}

          <div
            className={[
              "grid min-h-0 flex-1 gap-3 overflow-hidden transition-all duration-300",
              aiPanelOpen
                ? "lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_420px]"
                : "grid-cols-1",
            ].join(" ")}
          >
            <div className="grid min-h-0 gap-3 overflow-hidden max-lg:grid-rows-2 lg:grid-cols-2">
              <AlertZonePanel
                title={ui.alerts.zoneCritical}
                bucket="critical"
                alerts={alerts}
                patients={patients}
                operatorRole={operatorRole}
                filters={criticalFilters}
                onFiltersChange={setCriticalFilters}
                onTreat={setTreatmentAlert}
                onDoctorConfirm={setConfirmAlert}
                onAskAI={setSelectedAlert}
              />
              <AlertZonePanel
                title={ui.alerts.zoneWarning}
                bucket="warning"
                alerts={alerts}
                patients={patients}
                operatorRole={operatorRole}
                filters={warningFilters}
                onFiltersChange={setWarningFilters}
                onTreat={setTreatmentAlert}
                onDoctorConfirm={setConfirmAlert}
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
        </div>
      )}

      {treatmentAlert ? (
        <AlertTreatmentModal
          alert={treatmentAlert}
          patientName={patients[treatmentAlert.patientId]?.name}
          floorNurses={floorNurses}
          open
          submitting={submitting}
          onClose={() => setTreatmentAlert(null)}
          onSubmitTreat={async (payload) => {
            setSubmitting(true);
            try {
              const action =
                payload.outcome === "needs_follow_up"
                  ? ({
                      action: "needs_follow_up" as const,
                      ...payload,
                      followUpNote: payload.followUpNote,
                    } as const)
                  : ({
                      action: "nurse_treat" as const,
                      ...payload,
                    } as const);
              await alertRepository.submitAction(
                treatmentAlert.id,
                action,
                operatorRole,
              );
              await refreshAfterAction();
            } finally {
              setSubmitting(false);
            }
          }}
          onSubmitNoise={async (description) => {
            setSubmitting(true);
            try {
              await alertRepository.submitAction(
                treatmentAlert.id,
                { action: "mark_noise", description },
                operatorRole,
              );
              await refreshAfterAction();
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}

      {confirmAlert ? (
        <DoctorConfirmModal
          alert={confirmAlert}
          patientName={patients[confirmAlert.patientId]?.name}
          open
          submitting={submitting}
          onClose={() => setConfirmAlert(null)}
          onConfirm={async (conclusion) => {
            setSubmitting(true);
            try {
              await alertRepository.submitAction(
                confirmAlert.id,
                { action: "doctor_confirm", conclusion },
                "doctor",
              );
              await refreshAfterAction();
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}
    </ClinicalShell>
  );
}
