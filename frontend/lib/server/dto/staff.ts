import type { Shift, ShiftScheduleSlot, ShiftStaffMember } from "@/types";

export type StaffDto = {
  id: string;
  name: string;
  role: ShiftStaffMember["role"];
  zone_code: string;
  status: ShiftStaffMember["status"];
};

export type ShiftDto = {
  id: string;
  ward_code: string;
  ward_label: { vi: string; en: string };
  started_at: string;
  coordinator_id: string;
  staff: StaffDto[];
};

export type ScheduleSlotDto = {
  id: string;
  staff_id: string;
  date: string;
  band: ShiftScheduleSlot["band"];
  zone_code: string;
};

export function mapStaffDto(member: ShiftStaffMember): StaffDto {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    zone_code: member.zoneCode,
    status: member.status,
  };
}

export function mapShiftDto(shift: Shift): ShiftDto {
  return {
    id: shift.id,
    ward_code: shift.wardCode,
    ward_label: shift.wardLabel,
    started_at: shift.startedAt,
    coordinator_id: shift.coordinatorId,
    staff: shift.staff.map(mapStaffDto),
  };
}

export function mapScheduleSlotDto(slot: ShiftScheduleSlot): ScheduleSlotDto {
  return {
    id: slot.id,
    staff_id: slot.staffId,
    date: slot.date,
    band: slot.band,
    zone_code: slot.zoneCode,
  };
}

export function parseStaffInput(input: {
  name: string;
  role: ShiftStaffMember["role"];
  zone_code: string;
  status?: ShiftStaffMember["status"];
}): Omit<ShiftStaffMember, "id"> {
  return {
    name: input.name.trim(),
    role: input.role,
    zoneCode: input.zone_code.trim(),
    status: input.status ?? "active",
  };
}
