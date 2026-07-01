from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from observability.metrics import start_prometheus_server
from observability.queue_sampler import QueueSampler, default_queue_keys
from observability.report import EvaluationReport
from observability.team4_probe import RabbitMQTeam4Probe, SupabaseAlertsPollingProbe
from observability.trace import writer
from rabbit_mq.rabbitmq import RabbitMQSettings


BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_REPORT_DIR = BACKEND_DIR / "observability" / "reports"


def _run_id() -> str:
    return "run_" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run a realtime observability/evaluation replay.")
    parser.add_argument("--run-id", default=None)
    parser.add_argument("--profile", default="manual")
    parser.add_argument("--patient-id", default=None)
    parser.add_argument("--patient-ids", nargs="+", default=None)
    parser.add_argument("--concurrency", type=int, default=1)
    parser.add_argument("--output-dir", type=Path, default=BACKEND_DIR / "simulator" / "output")
    parser.add_argument("--streams", nargs="+", default=["wearable_continuous", "wearable_spo2_triggered", "wearable_ppi_batch", "wearable_motion_batch"])
    parser.add_argument("--limit", type=int, default=120)
    parser.add_argument("--skip", type=int, default=0)
    parser.add_argument("--target-msg-sec", type=float, default=5.0)
    parser.add_argument("--duration-seconds", type=float, default=None)
    parser.add_argument("--team4-path", choices=["rabbitmq", "supabase-poll", "none"], default="rabbitmq")
    parser.add_argument("--no-declare", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--prometheus-port", type=int, default=9108)
    parser.add_argument("--report-dir", type=Path, default=DEFAULT_REPORT_DIR)
    return parser


def _publisher_command(args: argparse.Namespace, run_id: str, *, patient_id: str | None, target_msg_sec: float) -> list[str]:
    cmd = [
        sys.executable,
        "-m",
        "simulator.pipeline.publisher.replay_generated_data",
        "--output-dir",
        str(args.output_dir),
        "--streams",
        *args.streams,
        "--limit",
        str(args.limit),
        "--skip",
        str(args.skip),
        "--run-id",
        run_id,
        "--target-msg-sec",
        str(target_msg_sec),
    ]
    if patient_id:
        cmd.extend(["--patient-id", patient_id])
    if args.duration_seconds is not None:
        cmd.extend(["--duration-seconds", str(args.duration_seconds)])
    if args.no_declare:
        cmd.append("--no-declare")
    if args.dry_run:
        cmd.append("--dry-run")
    return cmd


def _patient_ids(args: argparse.Namespace) -> list[str | None]:
    if args.patient_ids:
        return list(args.patient_ids)
    if args.patient_id:
        return [args.patient_id]
    return [None]


def _run_publishers(args: argparse.Namespace, run_id: str) -> tuple[int, float, list[dict[str, Any]]]:
    patients = _patient_ids(args)
    per_publisher_rate = args.target_msg_sec / max(len(patients), 1)
    commands = [
        _publisher_command(args, run_id, patient_id=patient_id, target_msg_sec=per_publisher_rate)
        for patient_id in patients
    ]
    started = time.perf_counter()
    results: list[dict[str, Any]] = []
    returncode = 0
    concurrency = max(args.concurrency, 1)

    for offset in range(0, len(commands), concurrency):
        batch = commands[offset : offset + concurrency]
        procs = [
            subprocess.Popen(cmd, cwd=BACKEND_DIR, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            for cmd in batch
        ]
        for index, proc in enumerate(procs):
            stdout, stderr = proc.communicate()
            patient_id = patients[offset + index]
            result = {
                "patient_id": patient_id,
                "cmd": " ".join(batch[index]),
                "returncode": proc.returncode,
                "stdout": stdout[-2000:],
                "stderr": stderr[-2000:],
            }
            results.append(result)
            if proc.returncode:
                returncode = proc.returncode

    return returncode, (time.perf_counter() - started) * 1000, results


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    run_id = args.run_id or _run_id()
    start_prometheus_server(args.prometheus_port)

    config: dict[str, Any] = {
        "profile": args.profile,
        "patient_id": args.patient_id,
        "patient_ids": args.patient_ids,
        "concurrency": args.concurrency,
        "streams": args.streams,
        "limit": args.limit,
        "target_msg_sec": args.target_msg_sec,
        "duration_seconds": args.duration_seconds,
        "team4_path": args.team4_path,
    }
    writer.create_run(run_id, profile=args.profile, config=config)
    writer.record_step(run_id, step="evaluation_started", status="running", metadata=config)

    settings = None if args.dry_run else RabbitMQSettings.from_env()
    sampler = None
    probe = None
    if settings is not None:
        sampler = QueueSampler(run_id=run_id, settings=settings, queue_keys=default_queue_keys())
        sampler.start()
        writer.record_step(run_id, step="queue_sampler_started", status="passed")

    if args.team4_path == "rabbitmq" and settings is not None:
        probe = RabbitMQTeam4Probe(run_id=run_id, settings=settings, timeout_seconds=max(args.duration_seconds or 30, 30))
        probe.start()
    elif args.team4_path == "supabase-poll":
        probe = SupabaseAlertsPollingProbe(run_id=run_id, timeout_seconds=max(args.duration_seconds or 30, 30))
        probe.start()

    writer.record_step(
        run_id,
        step="publisher_started",
        status="running",
        metadata={"patient_ids": _patient_ids(args), "concurrency": args.concurrency},
    )
    publisher_returncode, publish_ms, publisher_results = _run_publishers(args, run_id)
    if publisher_returncode == 0:
        writer.record_step(run_id, step="publisher_finished", status="passed", metadata={"duration_ms": publish_ms, "publishers": publisher_results})
    else:
        writer.record_step(run_id, step="publisher_failed", status="failed", metadata={"publishers": publisher_results})

    wait_seconds = min(max(args.duration_seconds or 10, 5), 30)
    time.sleep(wait_seconds)
    if probe is not None:
        probe.stop()
    if sampler is not None:
        sampler.stop()

    team4_summary = probe.summary() if probe is not None else {}
    latency_summary = writer.record_latency_results(run_id)
    team4_p95 = latency_summary.get("team4_receive_latency_ms", {}).get("p95_ms")
    latency_warning = isinstance(team4_p95, (int, float)) and team4_p95 > 2000
    status = (
        "passed"
        if publisher_returncode == 0 and team4_summary.get("duplicate_count", 0) == 0 and not latency_warning
        else "warning"
    )
    summary = {
        "publisher_returncode": publisher_returncode,
        "publisher_duration_ms": round(publish_ms, 2),
        "publisher_count": len(publisher_results),
        "team4_received_count": team4_summary.get("received_count", 0),
        "team4_duplicate_count": team4_summary.get("duplicate_count", 0),
        "team4_missed_count": team4_summary.get("missed_count", 0),
        "latency_summary": latency_summary,
        "report_generated_at": datetime.now(timezone.utc).isoformat(),
    }
    writer.finish_run(run_id, status=status, summary=summary)
    writer.record_result(run_id, metric="publisher_returncode", status="passed" if publisher_returncode == 0 else "failed", value_numeric=publisher_returncode)
    writer.record_result(
        run_id,
        metric="team4_duplicate_alerts",
        status="passed" if summary["team4_duplicate_count"] == 0 else "failed",
        value_numeric=summary["team4_duplicate_count"],
        threshold="0",
    )
    writer.record_result(
        run_id,
        metric="team4_missed_alerts",
        status="passed" if summary["team4_missed_count"] == 0 else "failed",
        value_numeric=summary["team4_missed_count"],
        threshold="0",
    )

    paths = EvaluationReport(run_id=run_id, status=status, summary=summary, output_dir=args.report_dir).write()
    print(json.dumps({"run_id": run_id, "status": status, "report": paths}, default=str))
    return 0 if publisher_returncode == 0 else publisher_returncode


if __name__ == "__main__":
    raise SystemExit(main())
