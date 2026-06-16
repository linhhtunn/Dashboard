import patientsSeed from "@/data/patients.seed.json";
import alertsSeed from "@/data/alerts.seed.json";
import vitalsSeed from "@/data/vitals.seed.json";
import rosterSeed from "@/data/shifts/roster.seed.json";
import shiftSeed from "@/data/shifts/shift.seed.json";
import operatorSessionSeed from "@/data/operator-session.seed.json";

import {
  buildLocalizedPair,
  getDepartmentLabel,
  getMedicationLabel,
  getScheduleLabel,
  getWardLabelByCode,
  getZoneLabel,
} from "@/lib/i18n/domain";
import type {
  Alert,
  AlertSeverity,
  AlertType,
  Evidence,
  Gender,
  MedicationCycle,
  OperatorRole,
  Patient,
  PatientStatus,
  Shift,
  ShiftBand,
  ShiftScheduleSlot,
  ShiftStaffMember,
  ShiftStaffRole,
  ShiftStaffStatus,
  VitalSignalSample,
} from "@/types";
import type {
  AlertSeed,
  OperatorSessionSeed,
  PatientSeed,
  ShiftSeed,
  StaffSeed,
  VitalSeed,
} from "@/lib/server/seed/types";

function text(vi: string, en: string) {
  return { vi, en };
}

function hydratePatient(seed: PatientSeed): Patient {
  return {
    id: seed.id,
    mrn: seed.mrn,
    name: seed.name,
    age: seed.age,
    gender: seed.gender as Gender,
    status: seed.status as PatientStatus,
    wardCode: seed.ward_code,
    wardLabel: buildLocalizedPair(seed.ward_code, {
      [seed.ward_code]: text(
        getWardLabelByCode(seed.ward_code, "vi"),
        getWardLabelByCode(seed.ward_code, "en"),
      ),
    }),
    departmentCode: seed.department_code,
    departmentLabel: buildLocalizedPair(seed.department_code, {
      [seed.department_code]: text(
        getDepartmentLabel(seed.department_code, "vi"),
        getDepartmentLabel(seed.department_code, "en"),
      ),
    }),
    bed: seed.bed,
    underlyingConditionCodes: seed.underlying_condition_codes,
    medicationCycle: seed.medications.map(
      (item): MedicationCycle => ({
        medication: buildLocalizedPair(item.medication_code, {
          [item.medication_code]: text(
            getMedicationLabel(item.medication_code, "vi"),
            getMedicationLabel(item.medication_code, "en"),
          ),
        }),
        dosage: item.dosage,
        schedule: buildLocalizedPair(item.schedule_code, {
          [item.schedule_code]: text(
            getScheduleLabel(item.schedule_code, "vi"),
            getScheduleLabel(item.schedule_code, "en"),
          ),
        }),
        lastTakenAt: item.last_taken_at,
        nextDoseAt: item.next_dose_at,
      }),
    ),
    recentSymptomCodes: seed.recent_symptom_codes,
    lastUpdated: seed.last_updated,
  };
}

function mapEvidence(input: Record<string, unknown>): Evidence {
  return {
    kind: (input.kind as Evidence["kind"]) ?? "patient_context",
    metric: input.metric as Evidence["metric"] | undefined,
    symptomCode: (input.symptom_code as string) ?? undefined,
    value: typeof input.value === "number" ? input.value : undefined,
    unit: input.unit as Evidence["unit"] | undefined,
    timestamp: typeof input.timestamp === "string" ? input.timestamp : undefined,
    comparisonValue:
      typeof input.comparison_value === "number" ? input.comparison_value : undefined,
    comparisonWindow:
      typeof input.comparison_window === "string"
        ? (input.comparison_window as Evidence["comparisonWindow"])
        : undefined,
    noteKey: typeof input.note_key === "string" ? input.note_key : undefined,
  };
}

function hydrateAlert(seed: AlertSeed): Alert {
  return {
    id: seed.id,
    patientId: seed.patient_id,
    type: seed.type as AlertType,
    severity: seed.severity as AlertSeverity,
    score: seed.score,
    evidence: seed.evidence.map(mapEvidence),
    timestamp: seed.timestamp,
    acknowledged: seed.acknowledged,
    workflowStatus: "open",
  };
}

function hydrateVital(seed: VitalSeed): VitalSignalSample {
  return {
    patientId: seed.patient_id,
    timestamp: seed.timestamp,
    vitals: {
      heartRate: seed.heart_rate,
      respiratoryRate: seed.respiratory_rate,
      systolicBp: seed.systolic_bp,
      diastolicBp: seed.diastolic_bp,
      spo2: seed.spo2,
    },
  };
}

function hydrateStaff(seed: StaffSeed): ShiftStaffMember {
  return {
    id: seed.id,
    name: seed.name,
    role: seed.role as ShiftStaffRole,
    zoneCode: seed.zone_code,
    status: seed.status as ShiftStaffStatus,
  };
}

function hydrateShift(seed: ShiftSeed, staff: ShiftStaffMember[]): Shift {
  return {
    id: seed.id,
    wardCode: seed.ward_code,
    wardLabel: buildLocalizedPair(seed.ward_code, {
      [seed.ward_code]: text(
        getWardLabelByCode(seed.ward_code, "vi"),
        getWardLabelByCode(seed.ward_code, "en"),
      ),
    }),
    startedAt: seed.started_at,
    coordinatorId: seed.coordinator_id,
    staff,
  };
}

let patients: Patient[] = (patientsSeed as PatientSeed[]).map(hydratePatient);
let alerts: Alert[] = (alertsSeed as AlertSeed[]).map(hydrateAlert);
const vitals: VitalSignalSample[] = (vitalsSeed as VitalSeed[]).map(hydrateVital);
let staffRoster: ShiftStaffMember[] = (rosterSeed as StaffSeed[]).map(hydrateStaff);
let currentShift: Shift = hydrateShift(shiftSeed as ShiftSeed, staffRoster);
const operatorSession = operatorSessionSeed as OperatorSessionSeed;

export function getPatients(): Patient[] {
  return structuredClone(patients);
}

export function getPatientById(patientId: string): Patient | undefined {
  return structuredClone(patients.find((item) => item.id === patientId));
}

export function updatePatientStatus(patientId: string, status: PatientStatus) {
  patients = patients.map((patient) =>
    patient.id === patientId ? { ...patient, status } : patient,
  );
}

export function getAlerts(): Alert[] {
  return structuredClone(alerts);
}

export function getAlertById(alertId: string): Alert | undefined {
  return structuredClone(alerts.find((item) => item.id === alertId));
}

export function getVitals(): VitalSignalSample[] {
  return structuredClone(vitals);
}

export function getVitalsByPatient(patientId: string): VitalSignalSample[] {
  return structuredClone(vitals.filter((item) => item.patientId === patientId));
}

export function getShift(): Shift {
  return structuredClone(currentShift);
}

export function updateShiftCoordinator(coordinatorId: string): Shift {
  currentShift = { ...currentShift, coordinatorId };
  return getShift();
}

export function listStaff(): ShiftStaffMember[] {
  return structuredClone(currentShift.staff);
}

export function getStaffMember(staffId: string): ShiftStaffMember | undefined {
  return structuredClone(currentShift.staff.find((item) => item.id === staffId));
}

export function addStaff(member: Omit<ShiftStaffMember, "id">): ShiftStaffMember {
  const next: ShiftStaffMember = { ...member, id: `staff-${Date.now()}` };
  currentShift = { ...currentShift, staff: [...currentShift.staff, next] };
  staffRoster = currentShift.staff;
  return structuredClone(next);
}

export function removeStaff(staffId: string): boolean {
  const before = currentShift.staff.length;
  currentShift = {
    ...currentShift,
    staff: currentShift.staff.filter((member) => member.id !== staffId),
  };
  staffRoster = currentShift.staff;
  return currentShift.staff.length < before;
}

export function updateStaff(
  staffId: string,
  patch: Partial<Pick<ShiftStaffMember, "zoneCode" | "status" | "name">>,
): ShiftStaffMember | null {
  let updated: ShiftStaffMember | null = null;
  currentShift = {
    ...currentShift,
    staff: currentShift.staff.map((member) => {
      if (member.id !== staffId) return member;
      updated = { ...member, ...patch };
      return updated;
    }),
  };
  staffRoster = currentShift.staff;
  return updated ? structuredClone(updated) : null;
}

export function getFloorNurses(): ShiftStaffMember[] {
  return listStaff().filter((member) => member.role === "floor_nurse");
}

export function getOperatorActor(role: OperatorRole) {
  const binding = operatorSession.roles[role];
  if (!binding) return null;
  const member = getStaffMember(binding.staff_id);
  if (!member) return null;
  return {
    role,
    actorId: binding.actor_id,
    staffId: member.id,
    name: member.name,
  };
}

export function getZoneDisplay(zoneCode: string, locale: "vi" | "en" = "vi") {
  return getZoneLabel(zoneCode, locale);
}

// Schedule generation (deterministic from roster)
const BANDS: ShiftBand[] = ["morning", "afternoon", "night"];

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

function hashCode(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getWeekDates(anchor = new Date()): string[] {
  const monday = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => toDateKey(addDays(monday, index)));
}

let scheduleSlots: ShiftScheduleSlot[] = [];
let scheduleSeeded = false;

function generateDefaultWeekSlots(dates: string[]): ShiftScheduleSlot[] {
  const roster = listStaff().filter((member) => member.status !== "off");
  const slots: ShiftScheduleSlot[] = [];

  for (const date of dates) {
    for (const band of BANDS) {
      const coordinators = roster.filter((m) => m.role === "coordinator");
      const doctors = roster.filter((m) => m.role === "doctor");
      const nurses = roster.filter((m) => m.role === "floor_nurse");
      const bandOffset = band === "morning" ? 0 : band === "afternoon" ? 1 : 2;
      const assigned: ShiftStaffMember[] = [];

      if (band === "morning" && coordinators.length) {
        assigned.push(coordinators[hashCode(`${date}-coord`) % coordinators.length]);
      }
      if (doctors.length) {
        assigned.push(doctors[(hashCode(`${date}-${band}-doc`) + bandOffset) % doctors.length]);
      }
      const nurseCount = band === "night" ? 3 : 4;
      const used = new Set<string>();
      for (let index = 0; index < nurseCount; index += 1) {
        const nurse = nurses[(hashCode(`${date}-${band}-${index}`) + bandOffset) % nurses.length];
        if (nurse && !used.has(nurse.id)) {
          used.add(nurse.id);
          assigned.push(nurse);
        }
      }

      for (const member of assigned) {
        slots.push({
          id: `slot-${date}-${band}-${member.id}`,
          staffId: member.id,
          date,
          band,
          zoneCode: member.zoneCode,
        });
      }
    }
  }

  return slots;
}

function ensureScheduleSeeded(anchor = new Date()) {
  if (scheduleSeeded) return;
  const dates = getWeekDates(anchor);
  scheduleSlots = generateDefaultWeekSlots(dates);
  scheduleSeeded = true;
}

export function buildWeekSchedule(weekStart?: string): ShiftScheduleSlot[] {
  const anchor = weekStart ? new Date(`${weekStart}T00:00:00`) : new Date();
  ensureScheduleSeeded(anchor);
  const dates = new Set(getWeekDates(anchor));
  return scheduleSlots
    .filter((slot) => dates.has(slot.date))
    .map((slot) => structuredClone(slot));
}

export function getScheduleCell(date: string, band: ShiftBand): ShiftScheduleSlot[] {
  ensureScheduleSeeded(new Date(`${date}T00:00:00`));
  return scheduleSlots
    .filter((slot) => slot.date === date && slot.band === band)
    .map((slot) => structuredClone(slot));
}

export function addScheduleAssignment(
  date: string,
  band: ShiftBand,
  staffId: string,
): ShiftScheduleSlot {
  ensureScheduleSeeded(new Date(`${date}T00:00:00`));
  const member = getStaffMember(staffId);
  if (!member) {
    throw new Error("Staff member not found.");
  }
  const existing = scheduleSlots.find(
    (slot) => slot.date === date && slot.band === band && slot.staffId === staffId,
  );
  if (existing) {
    return structuredClone(existing);
  }
  const next: ShiftScheduleSlot = {
    id: `slot-${date}-${band}-${staffId}-${Date.now()}`,
    staffId,
    date,
    band,
    zoneCode: member.zoneCode,
  };
  scheduleSlots = [...scheduleSlots, next];
  return structuredClone(next);
}

export function removeScheduleAssignment(slotId: string): boolean {
  const before = scheduleSlots.length;
  scheduleSlots = scheduleSlots.filter((slot) => slot.id !== slotId);
  return scheduleSlots.length < before;
}

export function setScheduleCellAssignments(
  date: string,
  band: ShiftBand,
  staffIds: string[],
): ShiftScheduleSlot[] {
  ensureScheduleSeeded(new Date(`${date}T00:00:00`));
  scheduleSlots = scheduleSlots.filter(
    (slot) => !(slot.date === date && slot.band === band),
  );
  const uniqueIds = [...new Set(staffIds)];
  for (const staffId of uniqueIds) {
    const member = getStaffMember(staffId);
    if (!member) continue;
    scheduleSlots.push({
      id: `slot-${date}-${band}-${staffId}`,
      staffId,
      date,
      band,
      zoneCode: member.zoneCode,
    });
  }
  return getScheduleCell(date, band);
}

export function countOpenAlerts(): number {
  return alerts.length;
}

export function getClinicalSummary() {
  return {
    open_alert_count: alerts.length,
    critical_alert_count: alerts.filter((item) => item.severity === "critical").length,
    patient_count: patients.length,
    staff_on_duty_count: listStaff().filter((item) => item.status === "active").length,
  };
}
