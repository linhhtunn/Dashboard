from __future__ import annotations

import argparse
from pathlib import Path

from simulator.exporters import write_json, write_jsonl
from simulator.generation_config import DEFAULT_CONFIG_PATH, load_generation_config, with_overrides
from simulator.models import PatientProfile, parse_utc_datetime
from simulator.profile_generator import generate_patient_profiles
from simulator.profiles import get_profile
from simulator.wearable_faults import inject_wearable_faults
from simulator.wearable_signals import (
    generate_continuous_records,
    generate_daily_metrics,
    generate_ecg_records,
    generate_spo2_records,
)
from simulator.wearable_timeline import build_master_timeline, sleep_metrics_to_json, sleep_sessions_to_json


def load_profile_for_run(config) -> PatientProfile:
    profile_generator_config = dict(config.profile_generator or {})
    if profile_generator_config.get("enabled") and profile_generator_config.get("mode") == "single":
        generated_profiles = generate_patient_profiles(profile_generator_config)
        for profile_data in generated_profiles:
            if profile_data["patient_id"] == config.patient_id:
                return PatientProfile.from_dict(profile_data)

    return get_profile(config.patient_id, config.profiles_path)


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate wearable continuous, triggered, sleep, and daily metric data for one patient.",
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

    profile = load_profile_for_run(config)
    start_time = parse_utc_datetime(config.start_time)
    master_timeline, sleep_sessions = build_master_timeline(
        profile=profile,
        start_time=start_time,
        duration_seconds=config.duration_seconds,
        seed=config.seed,
    )

    continuous_path = config.output_path("wearable_continuous")
    spo2_path = config.output_path("wearable_spo2_triggered")
    ecg_path = config.output_path("wearable_ecg_triggered")
    faulty_continuous_path = config.output_path("faulty_wearable_continuous")
    faulty_spo2_path = config.output_path("faulty_wearable_spo2_triggered")
    faulty_ecg_path = config.output_path("faulty_wearable_ecg_triggered")
    fault_log_path = config.output_path("wearable_fault_log")
    sleep_path = config.output_path("sleep_timeline")
    sleep_metrics_path = config.output_path("sleep_metrics")
    daily_path = config.output_path("daily_metrics")

    continuous_records = list(
        generate_continuous_records(
            profile=profile,
            master_timeline=master_timeline,
            start_time=start_time,
            duration_seconds=config.duration_seconds,
            wearable_config=config.wearable,
            seed=config.seed,
        ),
    )
    continuous_count = write_jsonl(continuous_path, continuous_records)
    spo2_records = generate_spo2_records(
        profile=profile,
        start_time=start_time,
        duration_seconds=config.duration_seconds,
        wearable_config=config.wearable,
        seed=config.seed + 100,
    )
    ecg_records = generate_ecg_records(
        profile=profile,
        start_time=start_time,
        duration_seconds=config.duration_seconds,
        wearable_config=config.wearable,
        seed=config.seed + 200,
    )
    write_jsonl(spo2_path, spo2_records)
    write_jsonl(ecg_path, ecg_records)

    fault_log = []
    if config.wearable_fault_injector.get("enabled", False):
        faulty_continuous_records, continuous_fault_log = inject_wearable_faults(
            records=continuous_records,
            stream_name="wearable_continuous",
            config=config.wearable_fault_injector,
            seed=config.seed + 1000,
        )
        faulty_spo2_records, spo2_fault_log = inject_wearable_faults(
            records=spo2_records,
            stream_name="wearable_spo2_triggered",
            config=config.wearable_fault_injector,
            seed=config.seed + 1100,
        )
        faulty_ecg_records, ecg_fault_log = inject_wearable_faults(
            records=ecg_records,
            stream_name="wearable_ecg_triggered",
            config=config.wearable_fault_injector,
            seed=config.seed + 1200,
        )
        write_jsonl(faulty_continuous_path, faulty_continuous_records)
        write_jsonl(faulty_spo2_path, faulty_spo2_records)
        write_jsonl(faulty_ecg_path, faulty_ecg_records)
        fault_log = continuous_fault_log + spo2_fault_log + ecg_fault_log
        write_json(fault_log_path, fault_log)

    write_json(sleep_path, sleep_sessions_to_json(profile.patient_id, sleep_sessions))
    write_json(sleep_metrics_path, sleep_metrics_to_json(profile.patient_id, sleep_sessions))
    write_json(
        daily_path,
        generate_daily_metrics(
            profile=profile,
            sleep_sessions=sleep_sessions,
            start_time=start_time,
            duration_seconds=config.duration_seconds,
            seed=config.seed + 300,
        ),
    )

    print(f"Config: {config.config_path}")
    print(f"Generated wearable continuous: {continuous_path} ({continuous_count} records)")
    print(f"Generated SpO2 triggered: {spo2_path} ({len(spo2_records)} records)")
    print(f"Generated ECG triggered: {ecg_path} ({len(ecg_records)} records)")
    if config.wearable_fault_injector.get("enabled", False):
        print(f"Generated faulty wearable continuous: {faulty_continuous_path}")
        print(f"Generated faulty SpO2 triggered: {faulty_spo2_path}")
        print(f"Generated faulty ECG triggered: {faulty_ecg_path}")
        print(f"Generated wearable fault log: {fault_log_path} ({len(fault_log)} faults)")
    print(f"Generated sleep timeline: {sleep_path}")
    print(f"Generated sleep metrics: {sleep_metrics_path}")
    print(f"Generated daily metrics: {daily_path}")


if __name__ == "__main__":
    main()

