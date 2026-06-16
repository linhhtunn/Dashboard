"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { clinicalApiGet } from "@/lib/api/client";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import {
  getRoleLabel,
  getStaffInitials,
  getZoneLabel,
  roleAccent,
} from "@/lib/staff-ui";
import type { Shift, ShiftStaffMember, ShiftStaffRole, ShiftStaffStatus } from "@/types";

type ShiftStaffSidebarProps = {
  shift: Shift;
  staff: ShiftStaffMember[];
  selectedStaffId: string | null;
  onSelectStaff: (staffId: string | null) => void;
  onCoordinatorChange: (coordinatorId: string) => void;
  onUpdateStaff: (
    id: string,
    patch: Partial<Pick<ShiftStaffMember, "zoneCode" | "status" | "name">>,
  ) => void;
  onRemoveStaff: (id: string) => void;
  onAddStaff: (input: {
    name: string;
    role: ShiftStaffRole;
    zoneCode: string;
  }) => Promise<void>;
};

const statusDot: Record<ShiftStaffStatus, string> = {
  active: "bg-[color:var(--cs-teal)]",
  break: "bg-[color:#f5b300]",
  off: "bg-[color:var(--cs-text-soft)]",
};

export function ShiftStaffSidebar({
  shift,
  staff,
  selectedStaffId,
  onSelectStaff,
  onCoordinatorChange,
  onUpdateStaff,
  onRemoveStaff,
  onAddStaff,
}: ShiftStaffSidebarProps) {
  const { locale } = useLocale();
  const ui = useClinicalUi();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | ShiftStaffRole>("all");
  const [zoneCodes, setZoneCodes] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<ShiftStaffRole>("floor_nurse");
  const [newZoneCode, setNewZoneCode] = useState("zone_a");
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    void clinicalApiGet<{ zone_codes: string[] }>("/api/clinical/zones").then((payload) => {
      setZoneCodes(payload.zone_codes);
      if (payload.zone_codes[0]) setNewZoneCode(payload.zone_codes[0]);
    });
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return staff.filter((member) => {
      if (roleFilter !== "all" && member.role !== roleFilter) return false;
      if (!needle) return true;
      const zoneLabel = getZoneLabel(member.zoneCode, locale).toLowerCase();
      return (
        member.name.toLowerCase().includes(needle) || zoneLabel.includes(needle)
      );
    });
  }, [staff, query, roleFilter, locale]);

  const coordinators = staff.filter((member) => member.role === "coordinator");
  const roles: ShiftStaffRole[] = ["coordinator", "floor_nurse", "doctor"];

  return (
    <aside className="dashboard-surface flex h-full max-h-full min-h-0 w-full flex-col overflow-hidden rounded-[1.15rem] lg:max-w-[300px] lg:justify-self-end">
      <header className="shrink-0 space-y-2 border-b border-white/45 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[13px] font-semibold text-[color:var(--cs-heading)]">
            {ui.staff.staffList}
          </h2>
          <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--cs-text-soft)]">
            {staff.length} {ui.staff.people}
          </span>
        </div>

        <label className="dashboard-input flex h-8 items-center gap-2 rounded-[0.6rem] px-2">
          <Search className="h-3.5 w-3.5 text-[color:var(--cs-text-soft)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={ui.staff.searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-[11px] outline-none"
          />
        </label>

        <div className="grid grid-cols-2 gap-1.5">
          <select
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value as "all" | ShiftStaffRole)
            }
            className="dashboard-input h-8 rounded-[0.6rem] px-2 text-[10px]"
          >
            <option value="all">{ui.staff.allRoles}</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {getRoleLabel(role, locale)}
              </option>
            ))}
          </select>
          <select
            value={shift.coordinatorId}
            onChange={(event) => onCoordinatorChange(event.target.value)}
            className="dashboard-input h-8 rounded-[0.6rem] px-2 text-[10px]"
            title={ui.staff.coordinator}
          >
            {coordinators.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="dashboard-scroll-area min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain p-2">
        {filtered.map((member) => {
          const selected = selectedStaffId === member.id;
          return (
            <div
              key={member.id}
              className={[
                "rounded-[0.75rem] border p-2 transition",
                selected
                  ? "border-[color:rgba(13,71,161,0.35)] bg-[linear-gradient(135deg,rgba(13,71,161,0.08),rgba(0,150,136,0.06))]"
                  : "border-white/45 bg-white/35 hover:bg-white/50",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => onSelectStaff(selected ? null : member.id)}
                className="flex w-full items-start gap-2 text-left"
              >
                <span
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    roleAccent[member.role],
                  ].join(" ")}
                >
                  {getStaffInitials(member.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[11px] font-semibold text-[color:var(--cs-heading)]">
                      {member.name}
                    </span>
                    <span
                      className={[
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        statusDot[member.status],
                      ].join(" ")}
                    />
                  </span>
                  <span className="mt-0.5 flex flex-wrap gap-1 text-[9px] text-[color:var(--cs-text-soft)]">
                    <span>{getRoleLabel(member.role, locale)}</span>
                    <span>·</span>
                    <span>{getZoneLabel(member.zoneCode, locale)}</span>
                  </span>
                </span>
              </button>

              <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-1">
                <select
                  value={member.status}
                  onChange={(event) =>
                    onUpdateStaff(member.id, {
                      status: event.target.value as ShiftStaffStatus,
                    })
                  }
                  className="dashboard-input h-7 rounded-[0.5rem] px-1.5 text-[9px]"
                >
                  <option value="active">{ui.staff.statusActive}</option>
                  <option value="break">{ui.staff.statusBreak}</option>
                  <option value="off">{ui.staff.statusOff}</option>
                </select>
                <button
                  type="button"
                  onClick={() => onRemoveStaff(member.id)}
                  className="dashboard-input flex h-7 w-7 items-center justify-center rounded-[0.5rem] text-[color:var(--cs-danger)]"
                  aria-label={ui.common.remove}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <footer className="shrink-0 border-t border-white/45 p-2">
        {showAdd ? (
          <div className="space-y-1.5">
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder={ui.staff.name}
              className="dashboard-input h-8 w-full rounded-[0.6rem] px-2 text-[10px]"
            />
            <div className="grid grid-cols-2 gap-1">
              <select
                value={newRole}
                onChange={(event) =>
                  setNewRole(event.target.value as ShiftStaffRole)
                }
                className="dashboard-input h-8 rounded-[0.6rem] px-1.5 text-[10px]"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role, locale)}
                  </option>
                ))}
              </select>
              <select
                value={newZoneCode}
                onChange={(event) => setNewZoneCode(event.target.value)}
                className="dashboard-input h-8 rounded-[0.6rem] px-1.5 text-[10px]"
              >
                {zoneCodes.map((code) => (
                  <option key={code} value={code}>
                    {getZoneLabel(code, locale)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="dashboard-input h-8 flex-1 rounded-[0.6rem] text-[10px] font-semibold"
              >
                {ui.common.cancel}
              </button>
              <button
                type="button"
                disabled={saving || !newName.trim()}
                onClick={() => {
                  setSaving(true);
                  void onAddStaff({
                    name: newName.trim(),
                    role: newRole,
                    zoneCode: newZoneCode,
                  })
                    .then(() => {
                      setNewName("");
                      setShowAdd(false);
                    })
                    .finally(() => setSaving(false));
                }}
                className="inline-flex h-8 flex-1 items-center justify-center rounded-[0.6rem] bg-[linear-gradient(135deg,var(--cs-primary),var(--cs-teal))] text-[10px] font-semibold text-white disabled:opacity-60"
              >
                {ui.common.save}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="dashboard-input flex h-8 w-full items-center justify-center gap-1 rounded-[0.65rem] text-[11px] font-semibold text-[color:var(--cs-primary)]"
          >
            <Plus className="h-3.5 w-3.5" />
            {ui.staff.addStaff}
          </button>
        )}
      </footer>
    </aside>
  );
}
