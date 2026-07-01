from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from database.config import load_database_config
from database.repositories import TimescaleRepository
from database.schemas.timeseries import LatestSensorValue, WearableContinuous


def _duration_ms(start: float) -> float:
    return round((time.perf_counter() - start) * 1000, 3)


def _make_samples(count: int, batch_label: str) -> list[WearableContinuous]:
    now = datetime.now(timezone.utc).replace(microsecond=0)
    return [
        WearableContinuous(
            time=now + timedelta(seconds=i),
            message_id=f"bench_{batch_label}_{int(now.timestamp())}_{i}",
            patient_id="BENCH_P001",
            device_id="BENCH_DEVICE_001",
            heart_rate=70 + (i % 10),
            respiratory_rate=16,
        )
        for i in range(count)
    ]


def run_benchmark(batch_sizes: list[int]) -> dict[str, object]:
    config = load_database_config()
    repo = TimescaleRepository(config=config)
    results: dict[str, object] = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "batch_results": [],
    }
    for batch_size in batch_sizes:
        samples = _make_samples(batch_size, f"insert_{batch_size}")
        start = time.perf_counter()
        repo.insert_wearable_continuous(samples)
        insert_ms = _duration_ms(start)

        start = time.perf_counter()
        repo.insert_wearable_continuous(samples)
        duplicate_ms = _duration_ms(start)

        last = samples[-1]
        start = time.perf_counter()
        repo.upsert_latest_values(
            [
                LatestSensorValue(
                    patient_id=last.patient_id,
                    device_id=last.device_id,
                    metric="heart_rate",
                    value_numeric=last.heart_rate,
                    unit="bpm",
                    last_measured_at=last.time,
                    stream_name="wearable_continuous",
                )
            ]
        )
        upsert_latest_ms = _duration_ms(start)

        start = time.perf_counter()
        repo.fetch_continuous_window(samples[0].patient_id, samples[0].time, samples[-1].time + timedelta(seconds=1))
        query_ms = _duration_ms(start)

        rows_per_second = round(batch_size / (insert_ms / 1000), 2) if insert_ms else None
        results["batch_results"].append(
            {
                "batch_size": batch_size,
                "insert_ms": insert_ms,
                "insert_rows_per_second": rows_per_second,
                "duplicate_insert_ms": duplicate_ms,
                "latest_upsert_ms": upsert_latest_ms,
                "window_query_ms": query_ms,
            }
        )
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Benchmark Timescale insert/upsert/query performance.")
    parser.add_argument("--batch-sizes", default="100,500", help="Comma-separated batch sizes.")
    parser.add_argument("--yes", action="store_true", help="Required because this inserts benchmark rows.")
    args = parser.parse_args()
    if not args.yes:
        raise SystemExit("Refusing to insert benchmark data without --yes")

    batch_sizes = [int(item.strip()) for item in args.batch_sizes.split(",") if item.strip()]
    results = run_benchmark(batch_sizes)
    config = load_database_config()
    config.benchmark_results_dir.mkdir(parents=True, exist_ok=True)
    output_path = config.benchmark_results_dir / f"timescale_benchmark_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.json"
    output_path.write_text(json.dumps(results, indent=2, sort_keys=True), encoding="utf-8")
    print(json.dumps({"result_file": str(output_path), **results}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
