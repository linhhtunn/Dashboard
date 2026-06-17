import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  alertToDbRow,
  buildShift,
  mapBackendAlertRow,
  mapBackendPatientRow,
  mapDbActionLogRow,
  mapDbAlertRow,
  mapDbPatientRow,
  mapDbScheduleRow,
  mapDbStaffRow,
  patientToDbRow,
  type DbAlertRow,
  type DbBackendAlertRow,
  type DbBackendPatientRow,
  type DbPatientRow,
} from "@/lib/server/clinical-mappers";
import type {
  Alert,
  AlertActionLogEntry,
  AlertTreatmentRecord,
  AlertWorkflowStatus,
  OperatorRole,
  Patient,
  PatientStatus,
  Shift,
  ShiftBand,
  ShiftScheduleSlot,
  ShiftStaffMember,
  VitalSignalSample,
} from "@/types";

function getClient() {
  const client = createSupabaseAdminClient();
  if (!client) {
    throw new Error("Supabase is not configured for clinical data.");
  }
  return client;
}

function isMissingTableError(message: string) {
  return message.includes("Could not find the table") || message.includes("PGRST205");
}

async function readPortalPatients(): Promise<Patient[]> {
  const supabase = getClient();
  const { data, error } = await supabase.from("portal_patients").select("*");
  if (error) {
    if (isMissingTableError(error.message)) return [];
    throw new Error(error.message);
  }
  return (data as DbPatientRow[]).map(mapDbPatientRow);
}

async function readBackendPatients(): Promise<Patient[]> {
  const supabase = getClient();
  const { data, error } = await supabase.from("patients").select("*");
  if (error) {
    if (isMissingTableError(error.message)) return [];
    throw new Error(error.message);
  }
  return ((data ?? []) as DbBackendPatientRow[]).map(mapBackendPatientRow);
}

function mergePatientWithPortalOverlay(base: Patient, overlay: Patient): Patient {
  return {
    ...base,
    wardCode: overlay.wardCode !== "general_ward" ? overlay.wardCode : base.wardCode,
    departmentCode:
      overlay.departmentCode !== "internal_medicine"
        ? overlay.departmentCode
        : base.departmentCode,
    bed: overlay.bed ?? base.bed,
    wardLabel: overlay.wardLabel ?? base.wardLabel,
    departmentLabel: overlay.departmentLabel ?? base.departmentLabel,
    underlyingConditionCodes: overlay.underlyingConditionCodes.length
      ? overlay.underlyingConditionCodes
      : base.underlyingConditionCodes,
    medicationCycle: overlay.medicationCycle.length ? overlay.medicationCycle : base.medicationCycle,
    recentSymptomCodes: overlay.recentSymptomCodes.length
      ? overlay.recentSymptomCodes
      : base.recentSymptomCodes,
    lastUpdated: overlay.lastUpdated || base.lastUpdated,
    dbProfile: base.dbProfile,
  };
}

export async function getPatients(): Promise<Patient[]> {
  const backend = await readBackendPatients();
  if (backend.length === 0) return [];

  const portal = await readPortalPatients();
  const portalById = new Map(portal.map((patient) => [patient.id, patient]));

  return backend.map((patient) => {
    const overlay = portalById.get(patient.id);
    return overlay ? mergePatientWithPortalOverlay(patient, overlay) : patient;
  });
}

export async function getPatientById(patientId: string): Promise<Patient | undefined> {
  const patients = await getPatients();
  return patients.find((item) => item.id === patientId);
}

export async function updatePatientStatus(patientId: string, status: PatientStatus) {
  const supabase = getClient();
  const { error: portalError } = await supabase
    .from("portal_patients")
    .update({ status })
    .eq("id", patientId);

  if (!portalError) return;

  if (!isMissingTableError(portalError.message)) {
    const { error: backendError } = await supabase
      .from("patients")
      .update({ status })
      .eq("patient_id", patientId);
    if (backendError) throw new Error(backendError.message);
  }
}

async function readPortalAlerts(): Promise<Alert[]> {
  const supabase = getClient();
  const { data, error } = await supabase.from("portal_alerts").select("*");
  if (error) {
    if (isMissingTableError(error.message)) return [];
    throw new Error(error.message);
  }
  return (data as DbAlertRow[]).map(mapDbAlertRow);
}

async function readHealthAlerts(): Promise<Alert[]> {
  const supabase = getClient();
  const { data, error } = await supabase.from("health_alerts").select("*");
  if (error) {
    if (isMissingTableError(error.message)) return [];
    throw new Error(error.message);
  }
  return ((data ?? []) as DbBackendAlertRow[]).map(mapBackendAlertRow);
}

async function readBackendAlerts(): Promise<Alert[]> {
  const supabase = getClient();
  const { data, error } = await supabase.from("alerts").select("*");
  if (error) {
    if (isMissingTableError(error.message)) return [];
    throw new Error(error.message);
  }
  return ((data ?? []) as DbBackendAlertRow[]).map(mapBackendAlertRow);
}

function mergeAlertWithPortalOverlay(base: Alert, overlay: Alert): Alert {
  return {
    ...base,
    workflowStatus: overlay.workflowStatus,
    assignedFloorNurseId: overlay.assignedFloorNurseId,
    assignedZoneCode: overlay.assignedZoneCode,
    noiseNote: overlay.noiseNote,
    treatment: overlay.treatment,
    acknowledged: overlay.acknowledged || base.acknowledged,
  };
}

export async function getAlerts(): Promise<Alert[]> {
  const [backend, portal] = await Promise.all([
    readBackendAlerts(),
    readPortalAlerts(),
  ]);

  if (backend.length > 0) {
    const portalById = new Map(portal.map((alert) => [alert.id, alert]));
    return backend.map((alert) => {
      const overlay = portalById.get(alert.id);
      return overlay ? mergeAlertWithPortalOverlay(alert, overlay) : alert;
    });
  }

  const health = await readHealthAlerts();
  if (health.length > 0) return health;

  return portal;
}

export async function getAlertById(alertId: string): Promise<Alert | undefined> {
  const alerts = await getAlerts();
  return alerts.find((item) => item.id === alertId);
}

export async function updateAlertWorkflow(
  alertId: string,
  patch: Partial<{
    workflow_status: AlertWorkflowStatus;
    assigned_floor_nurse_id: string | null;
    assigned_zone_code: string | null;
    noise_note: string | null;
    treatment: AlertTreatmentRecord | null;
  }>,
) {
  const supabase = getClient();
  const { error } = await supabase.from("portal_alerts").update(patch).eq("id", alertId);
  if (error) throw new Error(error.message);
}

async function getCurrentShiftRow() {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("portal_shifts")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as { id: string; ward_code: string; started_at: string; coordinator_id: string | null } | null;
}

async function getShiftStaffRows(shiftId: string): Promise<ShiftStaffMember[]> {
  const supabase = getClient();
  const { data: links, error: linkError } = await supabase
    .from("portal_shift_staff")
    .select("staff_id")
    .eq("shift_id", shiftId);
  if (linkError) throw new Error(linkError.message);

  const staffIds = (links ?? []).map((row) => row.staff_id);
  if (!staffIds.length) return [];

  const { data, error } = await supabase
    .from("portal_staff")
    .select("*")
    .in("id", staffIds);
  if (error) throw new Error(error.message);

  return (data ?? []).map(mapDbStaffRow);
}

export async function getShift(): Promise<Shift> {
  const shiftRow = await getCurrentShiftRow();
  if (!shiftRow) {
    throw new Error("No active shift in database. Run: npm run db:seed");
  }
  const staff = await getShiftStaffRows(shiftRow.id);
  return buildShift(shiftRow, staff);
}

export async function updateShiftCoordinator(coordinatorId: string): Promise<Shift> {
  const shiftRow = await getCurrentShiftRow();
  if (!shiftRow) throw new Error("No active shift in database.");
  const supabase = getClient();
  const { error } = await supabase
    .from("portal_shifts")
    .update({ coordinator_id: coordinatorId })
    .eq("id", shiftRow.id);
  if (error) throw new Error(error.message);
  return getShift();
}

export async function listStaff(): Promise<ShiftStaffMember[]> {
  return (await getShift()).staff;
}

export async function getStaffMember(staffId: string): Promise<ShiftStaffMember | undefined> {
  return (await listStaff()).find((item) => item.id === staffId);
}

export async function addStaff(member: Omit<ShiftStaffMember, "id">): Promise<ShiftStaffMember> {
  const shiftRow = await getCurrentShiftRow();
  if (!shiftRow) throw new Error("No active shift in database.");
  const supabase = getClient();
  const next: ShiftStaffMember = { ...member, id: `staff-${Date.now()}` };

  const { error: staffError } = await supabase.from("portal_staff").upsert({
    id: next.id,
    name: next.name,
    role: next.role,
    zone_code: next.zoneCode,
    status: next.status,
  });
  if (staffError) throw new Error(staffError.message);

  const { error: linkError } = await supabase.from("portal_shift_staff").upsert({
    shift_id: shiftRow.id,
    staff_id: next.id,
  });
  if (linkError) throw new Error(linkError.message);

  return next;
}

export async function removeStaff(staffId: string): Promise<boolean> {
  const shiftRow = await getCurrentShiftRow();
  if (!shiftRow) return false;
  const supabase = getClient();
  const { error } = await supabase
    .from("portal_shift_staff")
    .delete()
    .eq("shift_id", shiftRow.id)
    .eq("staff_id", staffId);
  if (error) throw new Error(error.message);
  return true;
}

export async function updateStaff(
  staffId: string,
  patch: Partial<Pick<ShiftStaffMember, "zoneCode" | "status" | "name">>,
): Promise<ShiftStaffMember | null> {
  const supabase = getClient();
  const dbPatch: Record<string, string> = {};
  if (patch.name) dbPatch.name = patch.name;
  if (patch.zoneCode) dbPatch.zone_code = patch.zoneCode;
  if (patch.status) dbPatch.status = patch.status;

  const { data, error } = await supabase
    .from("portal_staff")
    .update(dbPatch)
    .eq("id", staffId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapDbStaffRow(data) : null;
}

export async function getFloorNurses(): Promise<ShiftStaffMember[]> {
  return (await listStaff()).filter((member) => member.role === "floor_nurse");
}

export async function getOperatorActor(role: OperatorRole) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("portal_operator_sessions")
    .select("*")
    .eq("role", role)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const member = await getStaffMember(data.staff_id);
  if (!member) return null;

  return {
    role,
    actorId: data.actor_id,
    staffId: member.id,
    name: member.name,
  };
}

export async function getWeekDates(anchor = new Date()): Promise<string[]> {
  const monday = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => toDateKey(addDays(monday, index)));
}

export async function buildWeekSchedule(weekStart?: string): Promise<ShiftScheduleSlot[]> {
  const dates = new Set(
    await getWeekDates(weekStart ? new Date(`${weekStart}T00:00:00`) : undefined),
  );
  const supabase = getClient();
  const { data, error } = await supabase.from("portal_schedule_slots").select("*");
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map(mapDbScheduleRow)
    .filter((slot) => dates.has(slot.date));
}

export async function getScheduleCell(
  date: string,
  band: ShiftBand,
): Promise<ShiftScheduleSlot[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("portal_schedule_slots")
    .select("*")
    .eq("date", date)
    .eq("band", band);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDbScheduleRow);
}

export async function addScheduleAssignment(
  date: string,
  band: ShiftBand,
  staffId: string,
): Promise<ShiftScheduleSlot> {
  const member = await getStaffMember(staffId);
  if (!member) throw new Error("Staff member not found.");

  const existing = (await getScheduleCell(date, band)).find(
    (slot) => slot.staffId === staffId,
  );
  if (existing) return existing;

  const next: ShiftScheduleSlot = {
    id: `slot-${date}-${band}-${staffId}-${Date.now()}`,
    staffId,
    date,
    band,
    zoneCode: member.zoneCode,
  };

  const supabase = getClient();
  const { error } = await supabase.from("portal_schedule_slots").insert({
    id: next.id,
    staff_id: next.staffId,
    date: next.date,
    band: next.band,
    zone_code: next.zoneCode,
  });
  if (error) throw new Error(error.message);
  return next;
}

export async function removeScheduleAssignment(slotId: string): Promise<boolean> {
  const supabase = getClient();
  const { error } = await supabase.from("portal_schedule_slots").delete().eq("id", slotId);
  if (error) throw new Error(error.message);
  return true;
}

export async function setScheduleCellAssignments(
  date: string,
  band: ShiftBand,
  staffIds: string[],
): Promise<ShiftScheduleSlot[]> {
  const supabase = getClient();
  const { error: deleteError } = await supabase
    .from("portal_schedule_slots")
    .delete()
    .eq("date", date)
    .eq("band", band);
  if (deleteError) throw new Error(deleteError.message);

  const uniqueIds = [...new Set(staffIds)];
  for (const staffId of uniqueIds) {
    await addScheduleAssignment(date, band, staffId);
  }
  return getScheduleCell(date, band);
}

export async function countOpenAlerts(): Promise<number> {
  const alerts = await getAlerts();
  return alerts.filter((item) => item.workflowStatus !== "doctor_confirmed").length;
}

export async function getClinicalSummary() {
  const [alerts, patients, staff] = await Promise.all([
    getAlerts(),
    getPatients(),
    listStaff(),
  ]);

  return {
    open_alert_count: alerts.filter((item) => item.workflowStatus !== "doctor_confirmed").length,
    critical_alert_count: alerts.filter((item) => item.severity === "critical").length,
    patient_count: patients.length,
    staff_on_duty_count: staff.filter((item) => item.status === "active").length,
  };
}

export async function appendAlertActionLog(
  entry: Omit<AlertActionLogEntry, "id" | "createdAt">,
): Promise<AlertActionLogEntry> {
  const supabase = getClient();
  const next = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    alert_id: entry.alertId,
    action: entry.action,
    actor_id: entry.actorId,
    actor_name: entry.actorName,
    actor_role: entry.actorRole,
    payload: entry.payload,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("portal_alert_action_logs").insert(next);
  if (error) throw new Error(error.message);
  return mapDbActionLogRow(next);
}

export async function getAlertActionHistory(alertId: string): Promise<AlertActionLogEntry[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("portal_alert_action_logs")
    .select("*")
    .eq("alert_id", alertId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDbActionLogRow);
}

export async function listPendingDoctorConfirmations(): Promise<string[]> {
  const alerts = await getAlerts();
  return alerts
    .filter((alert) =>
      ["nurse_treated", "noise", "needs_follow_up"].includes(alert.workflowStatus),
    )
    .map((alert) => alert.id);
}

export async function upsertPatients(patients: Patient[]) {
  const supabase = getClient();
  const rows = patients.map((patient) => patientToDbRow(patient));
  const { error } = await supabase.from("portal_patients").upsert(rows);
  if (error) throw new Error(error.message);
}

export async function upsertAlerts(alerts: Alert[]) {
  const supabase = getClient();
  const rows = alerts.map((alert) => alertToDbRow(alert));
  const { error } = await supabase.from("portal_alerts").upsert(rows);
  if (error) throw new Error(error.message);
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date): Date {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

import { getZoneLabel } from "@/lib/i18n/domain";

export function getZoneDisplay(zoneCode: string, locale: "vi" | "en" = "vi") {
  return getZoneLabel(zoneCode, locale);
}
