import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LocalizedString } from "@/types";

export type DoctorOption = {
  user_id: string;
  display_name: string;
  email: string | null;
};

export type AlertAssignment = {
  alert_id: string;
  patient_id: string;
  doctor_user_id: string;
  assigned_by_user_id: string;
  assigned_at: string;
};

export type EncounterRow = {
  id: string;
  patient_id: string;
  alert_id: string | null;
  doctor_user_id: string;
  status: "completed" | "cancelled";
  started_at: string;
  completed_at: string | null;
  symptoms: string;
  clinical_notes: string;
  conclusion: string;
  created_at: string;
};

async function getClient() {
  const client = await createSupabaseServerClient();
  if (!client) throw new Error("Supabase authentication is required.");
  return client;
}

export async function listDoctorOptions(): Promise<DoctorOption[]> {
  const client = await getClient();
  const { data, error } = await client
    .from("user_profiles")
    .select("user_id,display_name,email")
    .eq("role_code", "doctor")
    .order("display_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    user_id: row.user_id,
    display_name: row.display_name || row.email || "Bác sĩ",
    email: row.email,
  }));
}

export async function assignAlertToDoctor(input: {
  alertId: string;
  patientId: string;
  doctorUserId: string;
  assignedByUserId: string;
}): Promise<AlertAssignment> {
  const doctors = await listDoctorOptions();
  if (!doctors.some((doctor) => doctor.user_id === input.doctorUserId)) {
    throw new Error("Selected user is not a doctor.");
  }

  const client = await getClient();
  const row = {
    alert_id: input.alertId,
    patient_id: input.patientId,
    doctor_user_id: input.doctorUserId,
    assigned_by_user_id: input.assignedByUserId,
    assigned_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from("portal_alert_assignments")
    .upsert(row, { onConflict: "alert_id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as AlertAssignment;
}

export async function getAlertAssignment(alertId: string): Promise<AlertAssignment | null> {
  const client = await getClient();
  const { data, error } = await client
    .from("portal_alert_assignments")
    .select("*")
    .eq("alert_id", alertId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as AlertAssignment | null) ?? null;
}

export async function getAlertAssignments(alertIds: string[]): Promise<Map<string, AlertAssignment>> {
  if (!alertIds.length) return new Map();
  const client = await getClient();
  const { data, error } = await client
    .from("portal_alert_assignments")
    .select("*")
    .in("alert_id", alertIds);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((row) => [row.alert_id, row as AlertAssignment]));
}

export async function createCompletedEncounter(input: {
  patientId: string;
  alertId: string;
  doctorUserId: string;
  startedAt: string;
  symptoms: string;
  clinicalNotes: string;
  conclusion: string;
}): Promise<EncounterRow> {
  const client = await getClient();
  const { data, error } = await client
    .from("clinical_encounters")
    .insert({
      patient_id: input.patientId,
      alert_id: input.alertId,
      doctor_user_id: input.doctorUserId,
      status: "completed",
      started_at: input.startedAt,
      completed_at: new Date().toISOString(),
      symptoms: input.symptoms,
      clinical_notes: input.clinicalNotes,
      conclusion: input.conclusion,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as EncounterRow;
}

export async function listDailyEncounters(
  doctorUserId: string,
  date: string,
): Promise<EncounterRow[]> {
  const start = new Date(`${date}T00:00:00+07:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const client = await getClient();
  const { data, error } = await client
    .from("clinical_encounters")
    .select("*")
    .eq("doctor_user_id", doctorUserId)
    .eq("status", "completed")
    .gte("completed_at", start.toISOString())
    .lt("completed_at", end.toISOString())
    .order("completed_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as EncounterRow[];
}

export async function countPendingAssignments(doctorUserId: string): Promise<number> {
  const client = await getClient();
  const { data: assignments, error } = await client
    .from("portal_alert_assignments")
    .select("alert_id")
    .eq("doctor_user_id", doctorUserId);
  if (error) throw new Error(error.message);
  if (!assignments?.length) return 0;

  const completed = await listDailyEncounterAlertIds(doctorUserId);
  return assignments.filter((row) => !completed.has(row.alert_id)).length;
}

async function listDailyEncounterAlertIds(doctorUserId: string): Promise<Set<string>> {
  const client = await getClient();
  const { data, error } = await client
    .from("clinical_encounters")
    .select("alert_id")
    .eq("doctor_user_id", doctorUserId)
    .eq("status", "completed");
  if (error) throw new Error(error.message);
  return new Set((data ?? []).flatMap((row) => row.alert_id ? [row.alert_id] : []));
}

export function unassignedDepartmentLabel(): LocalizedString {
  return { vi: "Chưa phân khoa", en: "Unassigned" };
}
