/**
 * Probe TimescaleDB / PostgreSQL connection.
 * Run: npm run db:timescale:probe
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

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

const connectionString = (
  process.env.TIMESCALE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  ""
)
  .trim()
  .replace(/^postgres:\/\//, "postgresql://");

if (!connectionString) {
  console.error("Missing TIMESCALE_DATABASE_URL or DATABASE_URL in .env.local");
  process.exit(1);
}

const masked = connectionString.replace(/:\/\/([^:@/]+):([^@/]+)@/, "://$1:***@");
console.log(`Connecting to ${masked}`);

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
  connectionTimeoutMillis: 10_000,
});

try {
  const meta = await pool.query(`
    SELECT
      version() AS version,
      current_database() AS database,
      current_user AS user,
      inet_server_addr()::text AS host,
      inet_server_port() AS port,
      EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') AS timescale
  `);

  console.log("\nConnection OK:");
  console.log(meta.rows[0]);

  const tables = await pool.query(`
    SELECT table_schema, table_name, table_type
    FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name
    LIMIT 50
  `);

  console.log(`\nTables (first ${tables.rowCount}):`);
  for (const row of tables.rows) {
    console.log(`  ${row.table_schema}.${row.table_name} (${row.table_type})`);
  }

  const hypertables = await pool.query(`
    SELECT hypertable_schema, hypertable_name
    FROM timescaledb_information.hypertables
    ORDER BY hypertable_schema, hypertable_name
    LIMIT 30
  `).catch(() => ({ rows: [] }));

  if (hypertables.rows.length > 0) {
    console.log("\nHypertables:");
    for (const row of hypertables.rows) {
      console.log(`  ${row.hypertable_schema}.${row.hypertable_name}`);
    }
  }
} catch (error) {
  console.error("\nConnection failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await pool.end();
}
