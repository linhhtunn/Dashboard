/**
 * Read-only DB introspection. Run: node scripts/introspect-db.mjs
 */
import { createClient } from "@supabase/supabase-js";

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
  "health_alerts",
  "raw_vitals",
  "scenario_ground_truth",
  "clinical_patients",
  "clinical_alerts",
  "clinical_vitals",
];

for (const table of tables) {
  const { data, error } = await supabase.from(table).select("*").limit(1);
  if (error) {
    console.log(`${table}: ERROR ${error.code} ${error.message}`);
    continue;
  }
  const sample = data?.[0];
  console.log(
    `${table}: OK rows=${data?.length ?? 0} cols=${sample ? Object.keys(sample).join(",") : "(empty)"}`,
  );
}
