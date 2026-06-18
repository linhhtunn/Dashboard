"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ClinicalShell } from "@/components/clinical/ClinicalShell";
import { ShiftCellModal } from "@/components/staff/ShiftCellModal";
import { ShiftStaffSidebar } from "@/components/staff/ShiftStaffSidebar";
import { ShiftWeekCalendar } from "@/components/staff/ShiftWeekCalendar";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import { getWeekStartKey } from "@/lib/mock/shift-schedule";
import { useOperatorRole } from "@/lib/operator-role";
import { shiftRepository } from "@/lib/repositories/shift.repository";
import type { Shift, ShiftBand, ShiftScheduleSlot, ShiftStaffMember } from "@/types";

type OpenCell = { date: string; band: ShiftBand } | null;

export default function StaffPage() {
  const ui = useClinicalUi();
  const { role: operatorRole } = useOperatorRole();
  const [shift, setShift] = useState<Shift | null>(null);
  const [staff, setStaff] = useState<ShiftStaffMember[]>([]);
  const [schedule, setSchedule] = useState<{
    dates: string[];
    slots: ShiftScheduleSlot[];
  } | null>(null);
  const [weekStart, setWeekStart] = useState(() => getWeekStartKey());
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [openCell, setOpenCell] = useState<OpenCell>(null);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [nextShift, nextStaff, nextSchedule] = await Promise.all([
      shiftRepository.getCurrent(),
      shiftRepository.listStaff(),
      shiftRepository.getSchedule(weekStart),
    ]);
    setShift(nextShift);
    setStaff(nextStaff);
    setSchedule({ dates: nextSchedule.dates, slots: nextSchedule.slots });
  }, [weekStart]);

  useEffect(() => {
    let cancelled = false;
    void load()
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setError(
            nextError instanceof Error ? nextError.message : ui.staff.loadError,
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load, ui.staff.loadError]);

  const staffById = useMemo(
    () => Object.fromEntries(staff.map((member) => [member.id, member])),
    [staff],
  );

  const openCellSlots = useMemo(() => {
    if (!openCell || !schedule) return [];
    return schedule.slots.filter(
      (slot) => slot.date === openCell.date && slot.band === openCell.band,
    );
  }, [openCell, schedule]);

  function shiftWeek(days: number) {
    const anchor = new Date(`${weekStart}T00:00:00`);
    anchor.setDate(anchor.getDate() + days);
    setWeekStart(getWeekStartKey(anchor));
    setLoading(true);
    void load()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }

  async function refreshSchedule() {
    const nextSchedule = await shiftRepository.getSchedule(weekStart);
    setSchedule({ dates: nextSchedule.dates, slots: nextSchedule.slots });
  }

  if (operatorRole !== "coordinator") {
    return (
      <ClinicalShell title={ui.staff.title} description={ui.staff.description}>
        <div className="dashboard-surface rounded-[1.15rem] px-4 py-8 text-center text-[13px] text-[color:var(--cs-text-soft)]">
          {ui.common.forbiddenCoordinator}
        </div>
      </ClinicalShell>
    );
  }

  return (
    <ClinicalShell viewportLocked title={ui.staff.title} description={ui.staff.description}>
      {loading ? (
        <div className="dashboard-surface flex flex-1 items-center justify-center rounded-[1.15rem] px-4 py-8 text-center text-[13px] text-[color:var(--cs-text-soft)]">
          {ui.common.loading}
        </div>
      ) : error || !shift || !schedule ? (
        <div className="dashboard-surface flex flex-1 items-center justify-center rounded-[1.15rem] px-4 py-8 text-center text-[13px] text-[color:var(--cs-danger)]">
          {error ?? ui.common.noData}
        </div>
      ) : (
        <div className="grid h-full min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(240px,20%)]">
          <ShiftWeekCalendar
            shift={shift}
            dates={schedule.dates}
            slots={schedule.slots}
            staffById={staffById}
            onCellClick={(date, band) => setOpenCell({ date, band })}
            onPrevWeek={() => shiftWeek(-7)}
            onNextWeek={() => shiftWeek(7)}
            onToday={() => {
              setWeekStart(getWeekStartKey());
              setLoading(true);
              void load().finally(() => setLoading(false));
            }}
          />
          <ShiftStaffSidebar
            shift={shift}
            staff={staff}
            selectedStaffId={selectedStaffId}
            onSelectStaff={setSelectedStaffId}
            onCoordinatorChange={(coordinatorId) => {
              void shiftRepository
                .setCoordinator(coordinatorId, operatorRole)
                .then(() => load());
            }}
            onUpdateStaff={(id, patch) => {
              setStaff((current) =>
                current.map((member) =>
                  member.id === id ? { ...member, ...patch } : member,
                ),
              );
              void shiftRepository.updateStaff(id, patch, operatorRole);
            }}
            onRemoveStaff={(id) => {
              void shiftRepository.removeStaff(id, operatorRole).then(load);
              if (selectedStaffId === id) setSelectedStaffId(null);
            }}
            onAddStaff={async (input) => {
              await shiftRepository.addStaff(input, operatorRole);
              await load();
            }}
          />
        </div>
      )}

      {openCell ? (
        <ShiftCellModal
          open
          date={openCell.date}
          band={openCell.band}
          slots={openCellSlots}
          staffById={staffById}
          roster={staff}
          submitting={scheduleSubmitting}
          onClose={() => setOpenCell(null)}
          onAssign={async (staffId) => {
            setScheduleSubmitting(true);
            try {
              await shiftRepository.assignScheduleSlot(
                openCell.date,
                openCell.band,
                staffId,
                operatorRole,
              );
              await refreshSchedule();
            } finally {
              setScheduleSubmitting(false);
            }
          }}
          onRemove={async (slotId) => {
            setScheduleSubmitting(true);
            try {
              await shiftRepository.removeScheduleSlot(slotId, operatorRole);
              await refreshSchedule();
            } finally {
              setScheduleSubmitting(false);
            }
          }}
        />
      ) : null}
    </ClinicalShell>
  );
}
