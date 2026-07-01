from __future__ import annotations

import argparse
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from uuid import uuid4

from rabbit_mq.rabbitmq import DEFAULT_ENV_PATH, load_env_file
from simulator.realtime.runtime import (
    ABNORMAL_EVENT_TYPES,
    ACTIVITY_STATES,
    SPEEDS,
    RealtimeRunConfig,
    RealtimeSimulationRun,
)


@dataclass(frozen=True)
class ScheduledAbnormal:
    episode_type: str
    at_second: int
    duration_seconds: int | None


def run_headless_stream(args: argparse.Namespace) -> int:
    env_path = Path(args.env_path) if args.env_path else DEFAULT_ENV_PATH
    if env_path.exists():
        load_env_file(env_path)

    schedules = _parse_schedules(args.abnormal)
    runs = _build_runs(args, env_path if env_path.exists() else None)
    if not runs:
        raise SystemExit("No simulator runs were created.")

    print(f"Created {len(runs)} headless simulator run(s)")
    for run in runs:
        print(
            f"- run_id={run.run_id} patient_id={run.profile.patient_id} "
            f"publish={run.publish_rabbitmq} activity={run.current_activity}"
        )

    duration_seconds = int(args.duration_seconds)
    sleep_seconds = 0 if args.no_sleep else 1.0 / max(int(args.speed), 1)
    started: set[tuple[str, str, int]] = set()

    try:
        for second in range(duration_seconds):
            for run in runs:
                for schedule in schedules:
                    key = (run.run_id, schedule.episode_type, schedule.at_second)
                    if second == schedule.at_second and key not in started:
                        run.inject_abnormal(schedule.episode_type, schedule.duration_seconds)
                        started.add(key)
                        print(
                            f"Injected {schedule.episode_type} "
                            f"patient_id={run.profile.patient_id} at_second={second}"
                        )
                run.tick_once()
            if args.log_every and (second + 1) % args.log_every == 0:
                _print_progress(runs, second + 1, duration_seconds)
            if sleep_seconds > 0:
                time.sleep(sleep_seconds)
    except KeyboardInterrupt:
        print("Interrupted, stopping simulator runs...")
    finally:
        for run in runs:
            run.stop()
            run.close()
        _print_progress(runs, duration_seconds, duration_seconds, final=True)
    return 0


def _build_runs(args: argparse.Namespace, env_path: Path | None) -> list[RealtimeSimulationRun]:
    patient_ids = list(args.patients or [])
    if not patient_ids:
        patient_ids = [None] * max(1, int(args.patient_count))

    runs: list[RealtimeSimulationRun] = []
    for index, patient_id in enumerate(patient_ids, start=1):
        run_id = uuid4().hex
        config = RealtimeRunConfig(
            name=args.name if len(patient_ids) == 1 else f"{args.name} {index}",
            patient_id=patient_id,
            patient_source=args.patient_source,
            age=args.age,
            gender=args.gender,
            lifestyle=args.lifestyle,
            health_status=args.health_status,
            risk_factors=list(args.risk_factors),
            pregnancy_status=args.pregnancy_status,
            activity=args.activity,
            speed=args.speed,
            duration_seconds=args.duration_seconds,
            publish_rabbitmq=bool(args.publish),
            validate_existing_patient=bool(args.validate_existing_patient),
            seed=args.seed + index - 1,
        )
        runs.append(RealtimeSimulationRun(run_id=run_id, config=config, env_path=env_path))
    return runs


def _parse_schedules(values: list[str]) -> list[ScheduledAbnormal]:
    schedules: list[ScheduledAbnormal] = []
    for value in values:
        parts = value.split(":")
        if len(parts) not in {2, 3}:
            raise SystemExit("--abnormal format must be episode_type:at_second[:duration_seconds]")
        episode_type = parts[0]
        if episode_type not in ABNORMAL_EVENT_TYPES:
            raise SystemExit(f"Unsupported abnormal event: {episode_type}")
        try:
            at_second = int(parts[1])
            duration_seconds = int(parts[2]) if len(parts) == 3 else None
        except ValueError as exc:
            raise SystemExit("--abnormal at_second/duration_seconds must be integers") from exc
        if at_second < 0:
            raise SystemExit("--abnormal at_second must be >= 0")
        schedules.append(ScheduledAbnormal(episode_type, at_second, duration_seconds))
    return schedules


def _print_progress(
    runs: list[RealtimeSimulationRun],
    second: int,
    duration_seconds: int,
    *,
    final: bool = False,
) -> None:
    label = "Final" if final else "Progress"
    print(f"{label}: sim_second={second}/{duration_seconds}")
    for run in runs:
        snapshot = run.snapshot()
        publisher: dict[str, Any] = snapshot.get("publisher", {})
        print(
            f"  patient_id={run.profile.patient_id} status={snapshot['status']} "
            f"rabbit_published={publisher.get('published_count', 0)} "
            f"pending={publisher.get('pending', 0)} dropped={publisher.get('dropped_messages', 0)}"
        )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run the realtime simulator without the frontend/web API.")
    parser.add_argument("--patients", nargs="*", help="Patient IDs to simulate. Required for existing publish mode.")
    parser.add_argument("--patient-count", type=int, default=1, help="Number of sandbox patients when --patients is omitted.")
    parser.add_argument("--patient-source", choices=("sandbox", "existing"), default="sandbox")
    parser.add_argument("--name", default="Headless Simulator Patient")
    parser.add_argument("--age", type=int, default=68)
    parser.add_argument("--gender", default="male")
    parser.add_argument("--pregnancy-status", default="none")
    parser.add_argument("--lifestyle", default="low_activity")
    parser.add_argument("--health-status", default="WARNING")
    parser.add_argument(
        "--risk-factors",
        nargs="*",
        default=["hypertension_risk", "fall_risk"],
        help="Simulator risk factors for generated baseline.",
    )
    parser.add_argument("--activity", choices=ACTIVITY_STATES, default="resting")
    parser.add_argument("--speed", type=int, choices=SPEEDS, default=1)
    parser.add_argument("--duration-seconds", type=int, default=120)
    parser.add_argument(
        "--abnormal",
        action="append",
        default=[],
        help="Schedule abnormal event as episode_type:at_second[:duration_seconds]. May repeat.",
    )
    parser.add_argument("--publish", action="store_true", help="Publish generated messages to RabbitMQ.")
    parser.add_argument(
        "--validate-existing-patient",
        action="store_true",
        help="Validate patient IDs in Supabase before publishing existing-patient runs.",
    )
    parser.add_argument("--env-path", default=str(DEFAULT_ENV_PATH), help="Path to RabbitMQ/database .env file.")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--log-every", type=int, default=15, help="Progress log interval in simulation seconds.")
    parser.add_argument("--no-sleep", action="store_true", help="Replay as fast as possible instead of sleeping by speed.")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.duration_seconds <= 0:
        parser.error("--duration-seconds must be > 0")
    if args.publish and args.patient_source != "existing":
        parser.error("--publish requires --patient-source existing")
    if args.publish and not args.patients:
        parser.error("--publish requires explicit --patients IDs")
    return run_headless_stream(args)


if __name__ == "__main__":
    raise SystemExit(main())
