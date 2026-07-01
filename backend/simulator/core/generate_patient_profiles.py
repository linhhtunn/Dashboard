from __future__ import annotations

import argparse
from pathlib import Path

from simulator.core.exporters import write_json
from simulator.core.generation_config import DEFAULT_CONFIG_PATH, _load_python_config
from simulator.core.profile_generator import generate_patient_profiles


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Generate synthetic patient profiles with Monte Carlo sampling.")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG_PATH, help="Generation config Python file.")
    parser.add_argument("--output", type=Path, default=None, help="Optional output path for generated profiles.")
    parser.add_argument("--seed", type=int, default=None, help="Optional Monte Carlo seed override.")
    return parser


def main() -> None:
    args = build_arg_parser().parse_args()
    module = _load_python_config(args.config.resolve())
    config = dict(module.PROFILE_GENERATOR_CONFIG)
    if args.seed is not None:
        config["seed"] = args.seed

    output_path = args.output or Path(config["output_path"])
    profiles = generate_patient_profiles(config)
    write_json(output_path.resolve(), profiles)

    print(f"Generated patient profiles: {output_path.resolve()} ({len(profiles)} profiles)")
    print(f"Config: {args.config.resolve()}")


if __name__ == "__main__":
    main()
