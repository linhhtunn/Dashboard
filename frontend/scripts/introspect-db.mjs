/**
 * Read-only DB introspection for vitals-related tables.
 * Run: npm run db:introspect
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const VITALS_SOURCE_TABLES = {
  clean_vitals: "heart_rate, respiratory_rate, systolic_bp, diastolic_bp, spo2",
  wearable_continuous: "heart_rate, respiratory_rate",
  wearable_measurements: "systolic_bp, diastolic_bp, spo2",
  latest_sensor_values: "heart_rate, respiratory_rate, systolic_bp, diastolic_bp, spo2",
  health_features: "avg_heart_rate, avg_respiratory_rate, min_spo2",
  patients: "baseline_signals JSON",
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tables = [
  "patients",
  "alerts",
  "clean_vitals",
  "wearable_continuous",
  "wearable_measurements",
  "wearable_intervals",
  "latest_sensor_values",
  "health_features",
  "daily_hrv_metrics",
  "ecg_measurements",
  "raw_sensor_events",
  "health_alerts",
];

console.log("Vitals source mapping:");
for (const [table, fields] of Object.entries(VITALS_SOURCE_TABLES)) {
  console.log(`  ${table}: ${fields}`);
}

console.log("\nTable probe:");
for (const table of tables) {
  const { count, error: countError } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (countError) {
    console.log(`${table}: ERROR ${countError.code} ${countError.message}`);
    continue;
  }

  const { data, error } = await supabase.from(table).select("*").limit(1);
  if (error) {
    console.log(`${table}: ERROR ${error.code} ${error.message}`);
    continue;
  }

  const sample = data?.[0];
  console.log(
    `${table}: rows=${count ?? 0} cols=${sample ? Object.keys(sample).join(",") : "(empty)"}`,
  );
}
