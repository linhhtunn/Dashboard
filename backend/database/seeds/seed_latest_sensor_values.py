"""
Seed the latest_sensor_values cache for the real patients (P001..P010).

For each patient this reads the most recent reading of every dashboard metric from
the raw time-series tables and upserts one cache row per metric. For the simulated
historical dataset, "latest" is the final reading of the day (2026-06-15 23:59:59).

In production this cache is maintained by the real-time ingestion pipeline; this seed
just makes the dashboard usable with the simulated data.

Usage:
    python -m database.seeds.seed_latest_sensor_values
    python -m database.seeds.seed_latest_sensor_values --patients P001 P002
"""
from __future__ import annotations

import argparse

from database.clients.timescale_client import TimescaleClient
from database.repositories.timeseries_repository import TimescaleRepository
from database.schemas.timeseries import LatestSensorValue

DEFAULT_PATIENTS = [f"P{i:03d}" for i in range(1, 11)]

# metric -> (table, value_column, stream_name, unit, extra_filter)
METRICS = [
    ("heart_rate",       "wearable_continuous",   "heart_rate",       "continuous",     "bpm",         "time"),
    ("respiratory_rate", "wearable_continuous",   "respiratory_rate", "continuous",     "breaths/min", "time"),
    ("spo2",             "wearable_measurements", "spo2",             "spo2_triggered", "%",           "time"),
    ("systolic_bp",      "wearable_measurements", "systolic_bp",      "bp_triggered",   "mmHg",        "time"),
    ("diastolic_bp",     "wearable_measurements", "diastolic_bp",     "bp_triggered",   "mmHg",        "time"),
    ("battery_level",    "wearable_measurements", "battery_level",    "battery",        "%",           "time"),
    ("stress_score",     "wearable_intervals",    "stress_score",     "stress",         "score",       "time"),
]


def latest_for_patient(cur, pid: str) -> list[LatestSensorValue]:
    device_id = f"SIM_WATCH_{pid}"
    out: list[LatestSensorValue] = []
    for metric, table, col, stream, unit, tcol in METRICS:
        cur.execute(
            f"""
            SELECT {col}, {tcol}
            FROM public.{table}
            WHERE patient_id = %s AND {col} IS NOT NULL
            ORDER BY {tcol} DESC
            LIMIT 1
            """,
            (pid,),
        )
        row = cur.fetchone()
        if row is None:
            continue
        value, measured_at = row
        out.append(LatestSensorValue(
            patient_id=pid,
            device_id=device_id,
            metric=metric,
            value_numeric=float(value),
            unit=unit,
            last_measured_at=measured_at,
            stream_name=stream,
        ))
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed latest_sensor_values cache from raw signals.")
    parser.add_argument("--patients", nargs="*", default=DEFAULT_PATIENTS, help="e.g. P001 P002")
    args = parser.parse_args()

    client = TimescaleClient()
    repo = TimescaleRepository(client=client)

    print(f"Seeding latest_sensor_values for {len(args.patients)} patient(s)\n")
    total = 0
    for pid in args.patients:
        with client.connection() as conn:
            with conn.cursor() as cur:
                # Clear any stale rows for this patient (e.g. leftover manual-test metrics).
                cur.execute("DELETE FROM public.latest_sensor_values WHERE patient_id = %s", (pid,))
                values = latest_for_patient(cur, pid)
        n = repo.upsert_latest_values(values)
        total += n
        print(f"[{pid}] metrics={n}: {', '.join(v.metric for v in values)}")

    print(f"\nDone. total cache rows = {total}")


if __name__ == "__main__":
    main()
