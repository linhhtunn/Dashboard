"use client";

import { useMemo, useState } from "react";
import { Plus, Stethoscope, UserCog, Users, X } from "lucide-react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import {
  getBandLabel,
  getRoleLabel,
  getShiftBandHours,
  getStaffInitials,
  getZoneLabel,
  roleAccent,
} from "@/lib/staff-ui";
import type { ShiftBand, ShiftScheduleSlot, ShiftStaffMember, ShiftStaffRole } from "@/types";

type ShiftCellModalProps = {
  date: string;
  band: ShiftBand;
  slots: ShiftScheduleSlot[];
  staffById: Record<string, ShiftStaffMember>;
  roster: ShiftStaffMember[];
  open: boolean;
  submitting?: boolean;
  onClose: () => void;
  onAssign: (staffId: string) => Promise<void>;
  onRemove: (slotId: string) => Promise<void>;
};

const sectionOrder: ShiftStaffRole[] = ["coordinator", "doctor", "floor_nurse"];

const sectionIcon = {
  coordinator: UserCog,
  doctor: Stethoscope,
  nurse: Users,
} as const;

function formatCellTitle(date: string, locale: "vi" | "en") {
  const value = new Date(`${date}T12:00:00`);
  return value.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function sectionLabel(
  role: ShiftStaffRole,
  ui: ReturnType<typeof useClinicalUi>,
): string {
  if (role === "coordinator") return ui.staff.sectionCoordinator;
  if (role === "doctor") return ui.staff.sectionDoctor;
  return ui.staff.sectionNurse;
}

export function ShiftCellModal({
  date,
  band,
  slots,
  staffById,
  roster,
  open,
  submitting = false,
  onClose,
  onAssign,
  onRemove,
}: ShiftCellModalProps) {
  const { locale } = useLocale();
  const ui = useClinicalUi();
  const [addRole, setAddRole] = useState<ShiftStaffRole>("doctor");
  const [selectedStaffId, setSelectedStaffId] = useState("");

  const assignedIds = useMemo(
    () => new Set(slots.map((slot) => slot.staffId)),
    [slots],
  );

  const grouped = useMemo(() => {
    const map: Record<ShiftStaffRole, Array<{ slot: ShiftScheduleSlot; member: ShiftStaffMember }>> = {
      coordinator: [],
      doctor: [],
      floor_nurse: [],
    };
    for (const slot of slots) {
      const member = staffById[slot.staffId];
      if (member) {
        map[member.role].push({ slot, member });
      }
    }
    return map;
  }, [slots, staffById]);

  const availableToAdd = useMemo(
    () =>
      roster.filter(
        (member) =>
          member.role === addRole &&
          member.status !== "off" &&
          !assignedIds.has(member.id),
      ),
    [roster, addRole, assignedIds],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.5)] p-4 backdrop-blur-[3px]">
      <div
        role="dialog"
        aria-modal="true"
        className="dashboard-surface flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-[1.2rem] border border-white/55 shadow-[0_32px_64px_rgba(15,23,42,0.22)]"
      >
        <header className="shrink-0 border-b border-white/45 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--cs-teal)]">
                {ui.staff.modalTitle}
              </p>
              <h2 className="mt-1 text-[15px] font-semibold text-[color:var(--cs-heading)]">
                {formatCellTitle(date, locale)}
              </h2>
              <p className="mt-0.5 text-[12px] text-[color:var(--cs-text-soft)]">
                {getBandLabel(band, locale)} · {getShiftBandHours(band)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="dashboard-input flex h-8 w-8 items-center justify-center rounded-[0.6rem]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="dashboard-scroll-area min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
          {sectionOrder.map((role) => {
            const items = grouped[role];
            const Icon =
              role === "floor_nurse" ? sectionIcon.nurse : sectionIcon[role];
            return (
              <section key={role}>
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[color:var(--cs-primary)]" />
                  <h3 className="text-[12px] font-semibold text-[color:var(--cs-heading)]">
                    {sectionLabel(role, ui)}
                  </h3>
                  <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--cs-text-soft)]">
                    {items.length}
                  </span>
                </div>
                {items.length ? (
                  <ul className="space-y-1.5">
                    {items.map(({ slot, member }) => (
                      <li
                        key={slot.id}
                        className="flex items-center gap-2 rounded-[0.75rem] border border-white/50 bg-white/45 px-2.5 py-2"
                      >
                        <span
                          className={[
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                            roleAccent[member.role],
                          ].join(" ")}
                        >
                          {getStaffInitials(member.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-[color:var(--cs-heading)]">
                            {member.name}
                          </p>
                          <p className="text-[10px] text-[color:var(--cs-text-soft)]">
                            {getRoleLabel(member.role, locale)} ·{" "}
                            {getZoneLabel(member.zoneCode, locale)}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => void onRemove(slot.id)}
                          className="dashboard-input h-7 rounded-[0.5rem] px-2 text-[10px] font-semibold text-[color:var(--cs-danger)]"
                        >
                          {ui.staff.removeFromShift}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-[0.75rem] border border-dashed border-white/50 px-3 py-2 text-[11px] text-[color:var(--cs-text-soft)]">
                    {ui.staff.noStaffInSection}
                  </p>
                )}
              </section>
            );
          })}
        </div>

        <footer className="shrink-0 border-t border-white/45 px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold text-[color:var(--cs-heading)]">
            {ui.staff.addToShift}
          </p>
          <div className="flex flex-wrap gap-1 mb-2">
            {sectionOrder.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setAddRole(role);
                  setSelectedStaffId("");
                }}
                className={[
                  "rounded-full px-2.5 py-1 text-[10px] font-semibold transition",
                  addRole === role
                    ? "bg-[linear-gradient(135deg,var(--cs-primary),var(--cs-teal))] text-white"
                    : "dashboard-input text-[color:var(--cs-text)]",
                ].join(" ")}
              >
                {sectionLabel(role, ui)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <select
              value={selectedStaffId}
              onChange={(event) => setSelectedStaffId(event.target.value)}
              className="dashboard-input h-9 min-w-0 flex-1 rounded-[0.65rem] px-2 text-[11px]"
            >
              <option value="">{ui.staff.selectStaff}</option>
              {availableToAdd.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} · {getZoneLabel(member.zoneCode, locale)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={submitting || !selectedStaffId}
              onClick={() => {
                if (!selectedStaffId) return;
                void onAssign(selectedStaffId).then(() => setSelectedStaffId(""));
              }}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-[0.65rem] bg-[linear-gradient(135deg,var(--cs-primary),var(--cs-teal))] px-3 text-[11px] font-semibold text-white disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" />
              {ui.common.add}
            </button>
          </div>
          {!availableToAdd.length ? (
            <p className="mt-2 text-[10px] text-[color:var(--cs-text-soft)]">
              {ui.staff.allStaffAssigned}
            </p>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
