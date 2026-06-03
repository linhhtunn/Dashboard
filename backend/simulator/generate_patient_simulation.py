from __future__ import annotations

import argparse
from pathlib import Path

from backend.simulator.generation_config import DEFAULT_CONFIG_PATH, load_generation_config, with_overrides
from backend.simulator.exporters import write_json, write_jsonl
from backend.simulator.models import parse_utc_datetime
from backend.simulator.profiles import get_profile
from backend.simulator.signals import generate_vitals_messages
from backend.simulator.timeline import (
    build_timeline,
    ground_truth_to_json,
    timeline_to_json,
)


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate activity timeline, vitals JSONL, and scenario ground truth for one patient.",
    )
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG_PATH, help="Generation config Python file.")
    parser.add_argument("--patient-id", help="Optional override for config patient_id.")
    parser.add_argument("--output-dir", type=Path, help="Optional override for config output_dir.")
    parser.add_argument("--start-time", help="Optional override for config start_time.")
    parser.add_argument("--seed", type=int, help="Optional override for config Monte Carlo seed.")
    return parser


def main() -> None:
    args = build_arg_parser().parse_args()
    config = with_overrides(
        load_generation_config(args.config),
        patient_id=args.patient_id,
        start_time=args.start_time,
        seed=args.seed,
        output_dir=args.output_dir,
    )

    profile = get_profile(config.patient_id, config.profiles_path)
    start_time = parse_utc_datetime(config.start_time)
    segments = build_timeline(profile, config.timeline)

    timeline_path = config.output_path("activity_timeline")
    vitals_path = config.output_path("generated_vitals")
    ground_truth_path = config.output_path("scenario_ground_truth")

    write_json(
        timeline_path,
        timeline_to_json(profile, segments, start_time, config.sampling_interval_seconds),
    )
    row_count = write_jsonl(
        vitals_path,
        generate_vitals_messages(
            profile=profile,
            segments=segments,
            start_time=start_time,
            seed=config.seed,
            sampling_interval_seconds=config.sampling_interval_seconds,
        ),
    )
    write_json(ground_truth_path, ground_truth_to_json(profile, segments, start_time))

    print(f"Config: {config.config_path}")
    print(f"Generated timeline: {timeline_path}")
    print(f"Generated vitals: {vitals_path} ({row_count} messages)")
    print(f"Generated ground truth: {ground_truth_path}")


if __name__ == "__main__":
    main()
