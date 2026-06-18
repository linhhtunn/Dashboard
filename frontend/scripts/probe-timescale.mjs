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

function resolveTimescaleDatabaseUrlFromParts() {
  const rawUrl = process.env.TIMESCALE_DB_URL?.trim();
  const password = process.env.TIMESCALE_DB_PASSWORD?.trim();
  if (!rawUrl) return "";

  const parsed = new URL(rawUrl.replace(/^postgres:\/\//, "postgresql://"));
  if (password && !parsed.password) {
    parsed.password = password;
  }
  return parsed.toString();
}

const connectionString = (
  process.env.TIMESCALE_DATABASE_URL ||
  resolveTimescaleDatabaseUrlFromParts() ||
  process.env.DATABASE_URL ||
  ""
)
  .trim()
  .replace(/^postgres:\/\//, "postgresql://");

if (!connectionString) {
  console.error("Missing TIMESCALE_DATABASE_URL or DATABASE_URL in .env.local");
  process.exit(1);
}

const parsedConnectionString = new URL(connectionString);
if (parsedConnectionString.username && !parsedConnectionString.password) {
  console.error(
    "TIMESCALE_DATABASE_URL is missing a password. Use postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require",
  );
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

  const tableExists = async (tableName) => {
    const result = await pool.query(
      "SELECT to_regclass($1) IS NOT NULL AS exists",
      [tableName],
    );
    return Boolean(result.rows[0]?.exists);
  };

  if (await tableExists("wearable_continuous")) {
    const continuous = await pool.query(`
      SELECT
        patient_id,
        time,
        heart_rate,
        respiratory_rate
      FROM wearable_continuous
      WHERE heart_rate IS NOT NULL OR respiratory_rate IS NOT NULL
      ORDER BY time DESC
      LIMIT 5
    `);

    console.log(`\nTimescale sample: wearable_continuous (${continuous.rowCount} rows)`);
    console.table(continuous.rows);
  } else {
    console.log("\nTimescale sample: wearable_continuous table not found.");
  }

  if (await tableExists("wearable_measurements")) {
    const measurements = await pool.query(`
      SELECT
        patient_id,
        time,
        measurement_type,
        spo2,
        systolic_bp,
        diastolic_bp
      FROM wearable_measurements
      WHERE
        spo2 IS NOT NULL
        OR systolic_bp IS NOT NULL
        OR diastolic_bp IS NOT NULL
      ORDER BY time DESC
      LIMIT 5
    `);

    console.log(`\nTimescale sample: wearable_measurements (${measurements.rowCount} rows)`);
    console.table(measurements.rows);
  } else {
    console.log("\nTimescale sample: wearable_measurements table not found.");
  }
} catch (error) {
  console.error("\nConnection failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await pool.end();
}
