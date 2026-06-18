import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function probe(table, columns) {
  const found = [];
  for (const col of columns) {
    const { error } = await supabase.from(table).select(col).limit(1);
    if (!error) found.push(col);
  }
  console.log(`${table}: ${found.join(", ") || "(none)"}`);
}

await probe("patients", [
  "patient_id",
  "id",
  "name",
  "age",
  "gender",
  "status",
  "health_status",
  "medical_history",
  "mrn",
  "ward_code",
  "department_code",
  "bed",
  "underlying_condition_codes",
  "medications",
  "recent_symptom_codes",
  "last_updated",
  "created_at",
  "updated_at",
]);

await probe("alerts", [
  "alert_id",
  "id",
  "patient_id",
  "type",
  "alert_type",
  "severity",
  "score",
  "confidence",
  "evidence",
  "timestamp",
  "acknowledged",
  "workflow_status",
  "message",
  "health_status",
  "scenario_id",
  "created_at",
]);

await probe("scenario_ground_truth", [
  "scenario_id",
  "patient_id",
  "event_type",
  "ground_truth_label",
  "event_start",
  "event_end",
  "expected_severity",
  "expected_pattern",
  "created_at",
]);
