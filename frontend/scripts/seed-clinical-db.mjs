/**
 * Seed portal_* tables from JSON. Requires migration + service role key.
 * Run: npm run db:seed
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");
const envPath = join(root, ".env.local");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or publishable key).");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function readJson(name) {
  return JSON.parse(readFileSync(join(dataDir, name), "utf8"));
}

async function upsert(table, rows, onConflict) {
  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`  ${table}: ${rows.length} rows`);
}

const patients = readJson("patients.seed.json");
const alerts = readJson("alerts.seed.json");
const vitals = readJson("vitals.seed.json");
const roster = readJson("shifts/roster.seed.json");
const shift = readJson("shifts/shift.seed.json");
const operatorSession = readJson("operator-session.seed.json");

const portalPatients = patients.map((p) => ({
  id: p.id,
  mrn: p.mrn,
  name: p.name,
  age: p.age,
  gender: p.gender,
  status: p.status,
  ward_code: p.ward_code,
  department_code: p.department_code,
  bed: p.bed,
  underlying_condition_codes: p.underlying_condition_codes,
  recent_symptom_codes: p.recent_symptom_codes,
  medications: p.medications,
  last_updated: p.last_updated,
}));

const portalAlerts = alerts.map((a) => ({
  id: a.id,
  patient_id: a.patient_id,
  type: a.type,
  severity: a.severity,
  score: a.score ?? null,
  evidence: a.evidence,
  timestamp: a.timestamp,
  acknowledged: a.acknowledged,
  workflow_status: "open",
}));

const portalVitals = vitals.map((v) => ({
  patient_id: v.patient_id,
  timestamp: v.timestamp,
  heart_rate: v.heart_rate,
  respiratory_rate: v.respiratory_rate,
  systolic_bp: v.systolic_bp,
  diastolic_bp: v.diastolic_bp,
  spo2: v.spo2,
}));

const portalStaff = roster.map((s) => ({
  id: s.id,
  name: s.name,
  role: s.role,
  zone_code: s.zone_code,
  status: s.status,
}));

const portalShift = {
  id: shift.id,
  ward_code: shift.ward_code,
  started_at: shift.started_at,
  coordinator_id: shift.coordinator_id,
};

const portalShiftStaff = roster.map((s) => ({
  shift_id: shift.id,
  staff_id: s.id,
}));

const portalOperatorSessions = Object.entries(operatorSession.roles).map(
  ([role, binding]) => ({
    role,
    staff_id: binding.staff_id,
    actor_id: binding.actor_id,
  }),
);

// Deterministic schedule (same logic as old clinical-store)
const BANDS = ["morning", "afternoon", "night"];
function hashCode(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}
function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}
const monday = startOfWeek(new Date());
const dates = Array.from({ length: 7 }, (_, i) => toDateKey(addDays(monday, i)));
const activeRoster = roster.filter((m) => m.status !== "off");
const portalScheduleSlots = [];
for (const date of dates) {
  for (const band of BANDS) {
    const coordinators = activeRoster.filter((m) => m.role === "coordinator");
    const doctors = activeRoster.filter((m) => m.role === "doctor");
    const nurses = activeRoster.filter((m) => m.role === "floor_nurse");
    const bandOffset = band === "morning" ? 0 : band === "afternoon" ? 1 : 2;
    const assigned = [];
    if (band === "morning" && coordinators.length) {
      assigned.push(coordinators[hashCode(`${date}-coord`) % coordinators.length]);
    }
    if (doctors.length) {
      assigned.push(doctors[(hashCode(`${date}-${band}-doc`) + bandOffset) % doctors.length]);
    }
    const nurseCount = band === "night" ? 3 : 4;
    const used = new Set();
    for (let i = 0; i < nurseCount; i += 1) {
      const nurse = nurses[(hashCode(`${date}-${band}-${i}`) + bandOffset) % nurses.length];
      if (nurse && !used.has(nurse.id)) {
        used.add(nurse.id);
        assigned.push(nurse);
      }
    }
    for (const member of assigned) {
      portalScheduleSlots.push({
        id: `slot-${date}-${band}-${member.id}`,
        staff_id: member.id,
        date,
        band,
        zone_code: member.zone_code,
      });
    }
  }
}

console.log("Seeding portal clinical tables...");
await upsert("portal_patients", portalPatients, "id");
await upsert("portal_alerts", portalAlerts, "id");
await upsert("portal_vitals", portalVitals);
await upsert("portal_staff", portalStaff, "id");
await upsert("portal_shifts", [portalShift], "id");
await upsert("portal_shift_staff", portalShiftStaff, "shift_id,staff_id");
await upsert("portal_schedule_slots", portalScheduleSlots, "id");
await upsert("portal_operator_sessions", portalOperatorSessions, "role");
console.log("Done.");
