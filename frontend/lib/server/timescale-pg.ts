import "server-only";

import { Pool, type PoolConfig, type QueryResultRow } from "pg";

let pool: Pool | null = null;

export function isTimescaleConfigured(): boolean {
  return Boolean(resolveTimescaleDatabaseUrl());
}

function resolveTimescaleDatabaseUrl(): string | null {
  const raw =
    process.env.TIMESCALE_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    null;

  if (!raw) return null;

  // node-postgres accepts postgres:// and postgresql://
  return raw.replace(/^postgres:\/\//, "postgresql://");
}

export function getTimescalePool(): Pool {
  const connectionString = resolveTimescaleDatabaseUrl();
  if (!connectionString) {
    throw new Error(
      "TimescaleDB is not configured. Set TIMESCALE_DATABASE_URL or DATABASE_URL.",
    );
  }

  if (!pool) {
    const config: PoolConfig = {
      connectionString,
      max: Number(process.env.TIMESCALE_POOL_MAX ?? 8),
      idleTimeoutMillis: Number(process.env.TIMESCALE_POOL_IDLE_MS ?? 30_000),
      connectionTimeoutMillis: Number(process.env.TIMESCALE_CONNECT_TIMEOUT_MS ?? 10_000),
      ssl: connectionString.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined,
    };
    pool = new Pool(config);
  }

  return pool;
}

export async function timescaleQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const client = getTimescalePool();
  const result = await client.query<T>(text, params);
  return result.rows;
}

export async function probeTimescaleConnection(): Promise<{
  ok: boolean;
  version?: string;
  database?: string;
  timescale?: boolean;
  error?: string;
}> {
  if (!isTimescaleConfigured()) {
    return { ok: false, error: "TIMESCALE_DATABASE_URL / DATABASE_URL is not set." };
  }

  try {
    const rows = await timescaleQuery<{
      version: string;
      current_database: string;
      timescale: boolean | null;
    }>(
      `
        SELECT
          version() AS version,
          current_database() AS current_database,
          EXISTS (
            SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'
          ) AS timescale
      `,
    );

    const row = rows[0];
    return {
      ok: true,
      version: row?.version,
      database: row?.current_database,
      timescale: Boolean(row?.timescale),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function closeTimescalePool(): Promise<void> {
  if (!pool) return;
  const current = pool;
  pool = null;
  await current.end();
}
