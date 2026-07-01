#!/usr/bin/env python3
"""Check whether Dashboard A has backing data for a run/patient."""

from __future__ import annotations

import os
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


def main() -> int:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    env = load_env(env_path)
    run_id = os.getenv("CHECK_RUN_ID")
    patient_id = os.getenv("CHECK_PATIENT_ID")

    ts = psycopg2.connect(
        host=env["TIMESCALE_HOST"],
        port=int(env["TIMESCALE_PORT"]),
        dbname=env["TIMESCALE_DB"],
        user=env["TIMESCALE_USER"],
        password=env["TIMESCALE_PASSWORD"],
        sslmode=env.get("TIMESCALE_SSLMODE", "require"),
        connect_timeout=15,
    )
    with ts, ts.cursor() as cur:
        cur.execute("SELECT now(), current_setting('TimeZone')")
        print("DB now/timezone")
        print(cur.fetchone())

        print("LATEST test_runs")
        cur.execute(
            """
            SELECT run_id, profile, status, started_at
            FROM test_runs
            ORDER BY started_at DESC NULLS LAST
            LIMIT 8
            """
        )
        for row in cur.fetchall():
            print(row)

        print("\nLATEST wearable_continuous patients, last 30m")
        cur.execute(
            """
            SELECT patient_id, max(time) AS latest_time, count(*) AS rows
            FROM wearable_continuous
            WHERE time > now() - interval '30 minutes'
              AND (%s IS NULL OR patient_id = %s)
            GROUP BY patient_id
            ORDER BY latest_time DESC
            LIMIT 10
            """,
            (patient_id, patient_id),
        )
        for row in cur.fetchall():
            print(row)

        print("\nWINDOW CHECK for Dashboard A time range, last 30m")
        checks = [
            ("wearable_continuous", "time", "patient_id = %s", (patient_id,)),
            ("wearable_measurements", "time", "patient_id = %s", (patient_id,)),
            ("motion_batches", "time", "patient_id = %s", (patient_id,)),
            ("ppi_patches", "time", "patient_id = %s", (patient_id,)),
            ("perf_trace_events", "event_time", "run_id = %s AND patient_id = %s", (run_id, patient_id)),
        ]
        for table, column, predicate, params in checks:
            if any(param is None for param in params):
                continue
            cur.execute(
                f"""
                SELECT min({column}), max({column}), count(*)
                FROM {table}
                WHERE {predicate}
                """,
                params,
            )
            all_rows = cur.fetchone()
            cur.execute(
                f"""
                SELECT min({column}), max({column}), count(*)
                FROM {table}
                WHERE {predicate}
                  AND {column} BETWEEN now() - interval '30 minutes' AND now()
                """,
                params,
            )
            window_rows = cur.fetchone()
            print(f"{table}: all={all_rows} last30m={window_rows}")

        print("\nRAW sensor events by stream, last 30m")
        if patient_id is not None:
            cur.execute(
                """
                SELECT stream_name, min(time), max(time), count(*)
                FROM raw_sensor_events
                WHERE patient_id = %s
                  AND received_at > now() - interval '30 minutes'
                GROUP BY stream_name
                ORDER BY count(*) DESC
                """,
                (patient_id,),
            )
            for row in cur.fetchall():
                print(row)

            print("\nRAW abnormal contexts by stream, all time")
            cur.execute(
                """
                SELECT stream_name,
                       raw_payload->'context'->>'abnormal_event_type' AS abnormal_event_type,
                       count(*),
                       min(time),
                       max(time)
                FROM raw_sensor_events
                WHERE patient_id = %s
                GROUP BY stream_name, abnormal_event_type
                ORDER BY stream_name, abnormal_event_type NULLS FIRST
                """,
                (patient_id,),
            )
            for row in cur.fetchall():
                print(row)

        print("\nTRACE stages by component, all time")
        if run_id is not None and patient_id is not None:
            cur.execute(
                """
                SELECT component, stage, count(*), min(event_time), max(event_time)
                FROM perf_trace_events
                WHERE run_id = %s
                  AND patient_id = %s
                GROUP BY component, stage
                ORDER BY component, stage
                """,
                (run_id, patient_id),
            )
            for row in cur.fetchall():
                print(row)

        print("\nLATEST perf_trace_events, last 30m")
        cur.execute(
            """
            SELECT run_id, patient_id, component, stage, max(event_time) AS latest_time, count(*) AS rows
            FROM perf_trace_events
            WHERE event_time > now() - interval '30 minutes'
              AND (%s IS NULL OR run_id = %s)
              AND (%s IS NULL OR patient_id = %s)
            GROUP BY run_id, patient_id, component, stage
            ORDER BY latest_time DESC
            LIMIT 15
            """,
            (run_id, run_id, patient_id, patient_id),
        )
        for row in cur.fetchall():
            print(row)

    sb = psycopg2.connect(
        host=env["SUPABASE_HOST"],
        port=int(env["SUPABASE_PORT"]),
        dbname=env["SUPABASE_DB"],
        user=env["SUPABASE_USER"],
        password=env["SUPABASE_PASSWORD"],
        sslmode=env.get("SUPABASE_SSLMODE", "require"),
        connect_timeout=15,
    )
    with sb, sb.cursor() as cur:
        print("\nLATEST public.alerts")
        cur.execute(
            """
            SELECT alert_time, patient_id, alert_type, severity,
                   features->'observability'->>'run_id' AS run_id
            FROM public.alerts
            WHERE (%s IS NULL OR features->'observability'->>'run_id' = %s)
              AND (%s IS NULL OR patient_id = %s)
            ORDER BY alert_time DESC
            LIMIT 10
            """,
            (run_id, run_id, patient_id, patient_id),
        )
        for row in cur.fetchall():
            print(row)

        if run_id is not None:
            print("\npublic.alerts by exact run_id")
            cur.execute(
                """
                SELECT alert_time, patient_id, alert_type, severity, confidence,
                       features->'observability'->>'run_id' AS run_id
                FROM public.alerts
                WHERE features->'observability'->>'run_id' = %s
                ORDER BY alert_time DESC
                LIMIT 20
                """,
                (run_id,),
            )
            for row in cur.fetchall():
                print(row)

        if patient_id is not None:
            print("\npublic.alerts by patient_id")
            cur.execute(
                """
                SELECT alert_time, patient_id, alert_type, severity, confidence,
                       features->'observability'->>'run_id' AS run_id
                FROM public.alerts
                WHERE patient_id = %s
                ORDER BY alert_time DESC
                LIMIT 20
                """,
                (patient_id,),
            )
            for row in cur.fetchall():
                print(row)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
