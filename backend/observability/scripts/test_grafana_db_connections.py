#!/usr/bin/env python3
"""Test Postgres connections used by Grafana datasources."""

from __future__ import annotations

import sys
from pathlib import Path

import psycopg2


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def test_connection(name: str, *, host: str, port: str, db: str, user: str, password: str, sslmode: str) -> bool:
    print(f"\n=== {name} ===")
    print(f"host={host}:{port} db={db} user={user} sslmode={sslmode}")
    try:
        conn = psycopg2.connect(
            host=host,
            port=int(port),
            dbname=db,
            user=user,
            password=password,
            sslmode=sslmode,
            connect_timeout=15,
        )
        with conn.cursor() as cur:
            cur.execute("SELECT version()")
            version = cur.fetchone()[0]
            print("OK:", version[:80])
        conn.close()
        return True
    except Exception as exc:
        print("FAIL:", exc)
        return False


def probe_tables(env: dict[str, str]) -> None:
    print("\n=== Table probes ===")
    ts = psycopg2.connect(
        host=env["TIMESCALE_HOST"],
        port=int(env["TIMESCALE_PORT"]),
        dbname=env["TIMESCALE_DB"],
        user=env["TIMESCALE_USER"],
        password=env["TIMESCALE_PASSWORD"],
        sslmode=env.get("TIMESCALE_SSLMODE", "require"),
        connect_timeout=15,
    )
    with ts.cursor() as cur:
        for table in ("wearable_continuous", "perf_trace_events", "latest_sensor_values"):
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            print(f"Timescale {table}: {cur.fetchone()[0]} rows")
    ts.close()

    def _connect_supabase(*, use_pooler: bool) -> psycopg2.extensions.connection:
        if use_pooler:
            return psycopg2.connect(
                host=env["SUPABASE_POOLER_HOST"],
                port=int(env.get("SUPABASE_POOLER_PORT", env.get("SUPABASE_PORT", "5432"))),
                dbname=env["SUPABASE_DB"],
                user=env["SUPABASE_POOLER_USER"],
                password=env.get("SUPABASE_POOLER_PASSWORD", env.get("SUPABASE_PASSWORD", "")),
                sslmode=env.get("SUPABASE_SSLMODE", "require"),
                connect_timeout=15,
            )
        return psycopg2.connect(
            host=env["SUPABASE_HOST"],
            port=int(env["SUPABASE_PORT"]),
            dbname=env["SUPABASE_DB"],
            user=env["SUPABASE_USER"],
            password=env["SUPABASE_PASSWORD"],
            sslmode=env.get("SUPABASE_SSLMODE", "require"),
            connect_timeout=15,
        )

    # Prefer direct connection (db.<ref>.supabase.co), but fall back to pooler when
    # direct DNS/egress is blocked or the user intentionally uses pooler credentials.
    sb = None
    direct_error: str | None = None
    try:
        sb = _connect_supabase(use_pooler=False)
    except Exception as exc:
        direct_error = str(exc)
        if env.get("SUPABASE_POOLER_HOST"):
            sb = _connect_supabase(use_pooler=True)
        else:
            raise

    if direct_error is not None:
        print("Supabase probe: direct failed; used pooler fallback.")
        print("  direct_error:", direct_error)

    assert sb is not None
    with sb.cursor() as cur:
        for table in ("public.patients", "public.alerts"):
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            print(f"Supabase {table}: {cur.fetchone()[0]} rows")
    sb.close()


def main() -> int:
    env_path = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / ".env")
    env = load_env(env_path)

    required = [
        "TIMESCALE_HOST", "TIMESCALE_PORT", "TIMESCALE_DB", "TIMESCALE_USER", "TIMESCALE_PASSWORD",
        "SUPABASE_HOST", "SUPABASE_PORT", "SUPABASE_DB", "SUPABASE_USER", "SUPABASE_PASSWORD",
    ]
    missing = [key for key in required if not env.get(key)]
    if missing:
        print("Missing in observability/.env:", ", ".join(missing))
        print("Run: bash observability/scripts/update_env_from_db_urls.sh")
        return 1

    ok_ts = test_connection(
        "Health Timescale (TigerData)",
        host=env["TIMESCALE_HOST"],
        port=env["TIMESCALE_PORT"],
        db=env["TIMESCALE_DB"],
        user=env["TIMESCALE_USER"],
        password=env["TIMESCALE_PASSWORD"],
        sslmode=env.get("TIMESCALE_SSLMODE", "require"),
    )
    ok_sb = test_connection(
        "Health Supabase (direct)",
        host=env["SUPABASE_HOST"],
        port=env["SUPABASE_PORT"],
        db=env["SUPABASE_DB"],
        user=env["SUPABASE_USER"],
        password=env["SUPABASE_PASSWORD"],
        sslmode=env.get("SUPABASE_SSLMODE", "require"),
    )
    if not ok_sb and env.get("SUPABASE_POOLER_HOST"):
        ok_sb = test_connection(
            "Health Supabase (pooler fallback)",
            host=env["SUPABASE_POOLER_HOST"],
            port=env.get("SUPABASE_POOLER_PORT", "5432"),
            db=env["SUPABASE_DB"],
            user=env["SUPABASE_POOLER_USER"],
            password=env.get("SUPABASE_POOLER_PASSWORD", env["SUPABASE_PASSWORD"]),
            sslmode=env.get("SUPABASE_SSLMODE", "require"),
        )

    if ok_ts and ok_sb:
        probe_tables(env)
        print("\nAll datasource checks passed.")
        return 0

    print("\nSome checks failed.")
    if not ok_sb:
        print(
            "Supabase: copy the Direct connection string from "
            "Supabase Dashboard -> Project Settings -> Database, then re-run update_env_from_db_urls.sh"
        )
    return 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
