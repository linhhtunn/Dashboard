/**
 * Apply roles migration to Supabase Postgres.
 * Requires SUPABASE_DATABASE_URL (direct Postgres connection string).
 * Run: npm run db:migrate:roles
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");
const migrationPath = join(root, "supabase/migrations/20260618_roles.sql");

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

const connectionString = (
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  ""
).trim();

if (!connectionString) {
  console.error(
    "Set SUPABASE_DATABASE_URL in .env.local (Supabase → Project Settings → Database → Connection string).",
  );
  process.exit(1);
}

const sql = readFileSync(migrationPath, "utf8");
const masked = connectionString.replace(/:\/\/([^:@/]+):([^@/]+)@/, "://$1:***@");
console.log(`Applying ${migrationPath}`);
console.log(`Target: ${masked}`);

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

try {
  await pool.query(sql);

  const roles = await pool.query("SELECT code, label_vi FROM roles ORDER BY sort_order");
  console.log("\nRoles seeded:");
  for (const row of roles.rows) {
    console.log(`  - ${row.code}: ${row.label_vi}`);
  }

  const profiles = await pool.query("SELECT COUNT(*)::int AS count FROM user_profiles");
  console.log(`\nuser_profiles rows: ${profiles.rows[0]?.count ?? 0}`);
  console.log("\nMigration applied successfully.");
} catch (error) {
  console.error("\nMigration failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await pool.end();
}
