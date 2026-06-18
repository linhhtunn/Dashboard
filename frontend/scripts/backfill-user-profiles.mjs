/**
 * Backfill user_profiles from auth.users (requires service role).
 * Run: npm run db:backfill-profiles
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

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
  process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({
  perPage: 200,
});
if (usersError) {
  console.error("auth.admin.listUsers:", usersError.message);
  process.exit(1);
}

const users = usersData.users ?? [];
if (!users.length) {
  console.log("No auth users to backfill.");
  process.exit(0);
}

const rows = users.map((user) => {
  const meta = user.user_metadata ?? {};
  const role = meta.clinical_role;
  const roleCode =
    role === "admin" || role === "doctor" || role === "coordinator"
      ? role
      : "coordinator";

  return {
    user_id: user.id,
    role_code: roleCode,
    display_name:
      String(meta.full_name ?? meta.display_name ?? "").trim() ||
      user.email?.split("@")[0] ||
      user.id,
    email: user.email ?? null,
  };
});

const { error } = await admin.from("user_profiles").upsert(rows, { onConflict: "user_id" });
if (error) {
  console.error("user_profiles upsert:", error.message);
  process.exit(1);
}

console.log(`Backfilled ${rows.length} user profile(s):`);
for (const row of rows) {
  console.log(`  - ${row.email ?? row.user_id} → ${row.role_code}`);
}
