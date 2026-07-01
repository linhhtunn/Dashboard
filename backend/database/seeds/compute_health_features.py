"""
Compute 5-minute health_features for the real patients (P001..P010) from the raw
biosignal tables already loaded in TigerDB, then insert into public.health_features.

Per 5-minute window this aggregates:
  - avg/max heart_rate, avg respiratory_rate   <- wearable_continuous
  - avg stress_score, sum steps_count          <- wearable_intervals
  - min spo2                                    <- wearable_measurements
  - max acc/gyro magnitude                      <- motion_batches (motion_points jsonb)
  - ppi_rmssd_ms_avg                            <- ppi_patches (RMSSD of PPI intervals)

anomaly_score is left NULL: it is produced downstream by the Team AI model, not here.

Usage:
    python -m database.seeds.compute_health_features
    python -m database.seeds.compute_health_features --patients P001 P002
"""
from __future__ import annotations

import argparse
import math
from datetime import datetime, timedelta

from database.clients.timescale_client import TimescaleClient
from database.repositories.timeseries_repository import TimescaleRepository
from database.schemas.timeseries import HealthFeature

FEATURE_WINDOW = "5min"
WINDOW = timedelta(minutes=5)
DEFAULT_PATIENTS = [f"P{i:03d}" for i in range(1, 11)]


def _rmssd(intervals: list[float]) -> float | None:
    """Root mean square of successive differences over consecutive PPI intervals."""
    if len(intervals) < 2:
        return None
    diffs = [intervals[i + 1] - intervals[i] for i in range(len(intervals) - 1)]
    return math.sqrt(sum(d * d for d in diffs) / len(diffs))


def _bucket_map(cur, sql: str, pid: str) -> dict[datetime, tuple]:
    cur.execute(sql, (pid,))
    return {row[0]: row[1:] for row in cur.fetchall()}


def compute_patient(cur, pid: str) -> list[HealthFeature]:
    device_id = f"SIM_WATCH_{pid}"

    cont = _bucket_map(cur, """
        SELECT time_bucket('5 minutes', time) AS b,
               avg(heart_rate)::float, max(heart_rate)::float, avg(respiratory_rate)::float
        FROM public.wearable_continuous
        WHERE patient_id = %s
        GROUP BY b
    """, pid)

    intervals = _bucket_map(cur, """
        SELECT time_bucket('5 minutes', time) AS b,
               avg(stress_score) FILTER (WHERE stress_score IS NOT NULL)::float,
               sum(steps_count)  FILTER (WHERE steps_count  IS NOT NULL)::int
        FROM public.wearable_intervals
        WHERE patient_id = %s
        GROUP BY b
    """, pid)

    spo2 = _bucket_map(cur, """
        SELECT time_bucket('5 minutes', time) AS b, min(spo2)::float
        FROM public.wearable_measurements
        WHERE patient_id = %s AND spo2 IS NOT NULL
        GROUP BY b
    """, pid)

    motion = _bucket_map(cur, """
        SELECT time_bucket('5 minutes', window_start) AS b,
               max((p->>'acc_magnitude')::float),
               max((p->>'gyro_magnitude')::float)
        FROM public.motion_batches m, LATERAL jsonb_array_elements(m.motion_points) p
        WHERE m.patient_id = %s
        GROUP BY b
    """, pid)

    # PPI: gather intervals per bucket (in time order) and compute RMSSD in Python.
    cur.execute("""
        SELECT time_bucket('5 minutes', time) AS b, ppi_intervals_ms
        FROM public.ppi_patches
        WHERE patient_id = %s
        ORDER BY time
    """, (pid,))
    ppi_acc: dict[datetime, list[float]] = {}
    for bucket, ppi_list in cur.fetchall():
        if ppi_list:
            ppi_acc.setdefault(bucket, []).extend(float(x) for x in ppi_list)
    ppi_rmssd = {b: _rmssd(vals) for b, vals in ppi_acc.items()}

    buckets = set(cont) | set(intervals) | set(spo2) | set(motion) | set(ppi_rmssd)
    features: list[HealthFeature] = []
    for b in sorted(buckets):
        avg_hr, max_hr, avg_rr = cont.get(b, (None, None, None))
        avg_stress, steps = intervals.get(b, (None, None))
        (min_spo2,) = spo2.get(b, (None,))
        acc_max, gyro_max = motion.get(b, (None, None))
        features.append(HealthFeature(
            time=b + WINDOW,
            patient_id=pid,
            device_id=device_id,
            feature_window=FEATURE_WINDOW,
            source_window_start=b,
            source_window_end=b + WINDOW,
            avg_heart_rate=avg_hr,
            max_heart_rate=max_hr,
            avg_respiratory_rate=avg_rr,
            min_spo2=min_spo2,
            avg_stress_score=avg_stress,
            ppi_rmssd_ms_avg=ppi_rmssd.get(b),
            steps_count=steps,
            acc_magnitude_max=acc_max,
            gyro_magnitude_max=gyro_max,
            anomaly_score=None,
            features={"computed_by": "feature_pipeline_v1", "source": "tigerdb_raw"},
        ))
    return features


def main() -> None:
    parser = argparse.ArgumentParser(description="Compute health_features from raw TigerDB signals.")
    parser.add_argument("--patients", nargs="*", default=DEFAULT_PATIENTS, help="e.g. P001 P002")
    args = parser.parse_args()

    client = TimescaleClient()
    repo = TimescaleRepository(client=client)

    print(f"Computing health_features for {len(args.patients)} patient(s)\n")
    grand_total = 0
    for pid in args.patients:
        with client.connection() as conn:
            with conn.cursor() as cur:
                feats = compute_patient(cur, pid)
        inserted = repo.insert_health_features(feats)
        grand_total += inserted
        print(f"[{pid}] windows={len(feats)} inserted={inserted}")

    print(f"\nDone. total rows = {grand_total}")


if __name__ == "__main__":
    main()
