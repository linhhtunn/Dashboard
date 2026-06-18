import type { Shift, ShiftScheduleSlot, ShiftStaffMember, ShiftStaffRole, ShiftStaffStatus } from "@/types";
import { clinicalApiGet, clinicalApiSend } from "@/lib/api/client";
import type { OperatorRole } from "@/types";
import { operatorRoleHeaders } from "@/lib/operator-role";

type StaffDto = {
  id: string;
  name: string;
  role: ShiftStaffRole;
  zone_code: string;
  status: ShiftStaffStatus;
};

type ShiftDto = {
  id: string;
  ward_code: string;
  ward_label: Shift["wardLabel"];
  started_at: string;
  coordinator_id: string;
  staff: StaffDto[];
};

type ScheduleDto = {
  week_start: string;
  week_end: string;
  dates: string[];
  slots: Array<{
    id: string;
    staff_id: string;
    date: string;
    band: ShiftScheduleSlot["band"];
    zone_code: string;
  }>;
};

function mapStaff(dto: StaffDto): ShiftStaffMember {
  return {
    id: dto.id,
    name: dto.name,
    role: dto.role,
    zoneCode: dto.zone_code,
    status: dto.status,
  };
}

function mapShift(dto: ShiftDto): Shift {
  return {
    id: dto.id,
    wardCode: dto.ward_code,
    wardLabel: dto.ward_label,
    startedAt: dto.started_at,
    coordinatorId: dto.coordinator_id,
    staff: dto.staff.map(mapStaff),
  };
}

function mapScheduleSlot(
  dto: ScheduleDto["slots"][number],
): ShiftScheduleSlot {
  return {
    id: dto.id,
    staffId: dto.staff_id,
    date: dto.date,
    band: dto.band,
    zoneCode: dto.zone_code,
  };
}

export const shiftRepository = {
  async getCurrent(): Promise<Shift> {
    const payload = await clinicalApiGet<ShiftDto>("/api/shifts/current");
    return mapShift(payload);
  },

  async setCoordinator(coordinatorId: string, role: OperatorRole): Promise<Shift> {
    const payload = await clinicalApiSend<ShiftDto>(
      "/api/shifts/current",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(await operatorRoleHeaders(role)),
        },
        body: JSON.stringify({ coordinator_id: coordinatorId }),
      },
    );
    return mapShift(payload);
  },

  async listStaff(): Promise<ShiftStaffMember[]> {
    const payload = await clinicalApiGet<StaffDto[]>("/api/shifts/current/staff");
    return payload.map(mapStaff);
  },

  async assignScheduleSlot(
    date: string,
    band: ShiftScheduleSlot["band"],
    staffId: string,
    role: OperatorRole,
  ): Promise<ShiftScheduleSlot> {
    const payload = await clinicalApiSend<ScheduleDto["slots"][number]>(
      "/api/shifts/schedule/slots",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await operatorRoleHeaders(role)),
        },
        body: JSON.stringify({ date, band, staff_id: staffId }),
      },
    );
    return mapScheduleSlot(payload);
  },

  async removeScheduleSlot(slotId: string, role: OperatorRole): Promise<void> {
    await clinicalApiSend(
      `/api/shifts/schedule/slots?id=${encodeURIComponent(slotId)}`,
      {
        method: "DELETE",
        headers: await operatorRoleHeaders(role),
      },
    );
  },

  async getSchedule(weekStart?: string): Promise<{
    weekStart: string;
    weekEnd: string;
    dates: string[];
    slots: ShiftScheduleSlot[];
  }> {
    const query = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";
    const payload = await clinicalApiGet<ScheduleDto>(`/api/shifts/schedule${query}`);
    return {
      weekStart: payload.week_start,
      weekEnd: payload.week_end,
      dates: payload.dates,
      slots: payload.slots.map(mapScheduleSlot),
    };
  },

  async addStaff(
    input: { name: string; role: ShiftStaffRole; zoneCode: string; status?: ShiftStaffStatus },
    role: OperatorRole,
  ): Promise<ShiftStaffMember> {
    const payload = await clinicalApiSend<StaffDto>(
      "/api/shifts/current/staff",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await operatorRoleHeaders(role)),
        },
        body: JSON.stringify({
          name: input.name,
          role: input.role,
          zone_code: input.zoneCode,
          status: input.status,
        }),
      },
    );
    return mapStaff(payload);
  },

  async updateStaff(
    id: string,
    patch: Partial<Pick<ShiftStaffMember, "zoneCode" | "status" | "name">>,
    role: OperatorRole,
  ): Promise<ShiftStaffMember> {
    const payload = await clinicalApiSend<StaffDto>(
      "/api/shifts/current/staff",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(await operatorRoleHeaders(role)),
        },
        body: JSON.stringify({
          id,
          zone_code: patch.zoneCode,
          status: patch.status,
          name: patch.name,
        }),
      },
    );
    return mapStaff(payload);
  },

  async removeStaff(id: string, role: OperatorRole): Promise<void> {
    await clinicalApiSend(
      `/api/shifts/current/staff?id=${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: await operatorRoleHeaders(role),
      },
    );
  },
};
