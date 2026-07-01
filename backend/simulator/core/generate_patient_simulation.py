from __future__ import annotations

import argparse
from pathlib import Path

from simulator.core.exporters import write_json, write_jsonl
from simulator.core.generation_config import DEFAULT_CONFIG_PATH, load_generation_config, with_overrides
from simulator.core.models import PatientProfile, parse_utc_datetime
from simulator.core.profile_generator import generate_patient_profiles
from simulator.core.profiles import get_profile
from simulator.core.wearable_faults import inject_wearable_faults
from simulator.core.wearable_signals import (
    extract_abnormal_episodes,
    generate_battery_records,
    generate_bp_records,
    generate_continuous_records,
    generate_daily_metrics,
    generate_ecg_records,
    generate_motion_batch_records,
    generate_ppi_batch_records,
    generate_spo2_records,
    generate_steps_records,
    generate_stress_records,
    run_wearable_simulation,
)
from simulator.core.wearable_timeline import activity_timeline_to_json, build_master_timeline, sleep_sessions_to_json


def patient_info_to_json(profile: PatientProfile) -> dict:
    baseline = profile.wearable_baseline
    raw = profile.baseline
    return {
        "patient_id": profile.patient_id,
        "device_id": f"SIM_WATCH_{profile.patient_id}",
        "mimic_subject_id": profile.mimic_subject_id,
        "name": profile.name,
        "age": profile.age,
        "height_cm": profile.height_cm,
        "weight_kg": profile.weight_kg,
        "gender": profile.gender,
        "age_group": profile.age_group,
        "pregnancy_status": profile.pregnancy_status,
        "lifestyle": profile.lifestyle,
        "activity_level": profile.activity_level,
        "risk_factors": profile.risk_factors,
        "medical_history": profile.medical_history,
        "health_status": profile.health_status,
        "baseline_signals": {
            "heart_rate": int(round(baseline.resting_heart_rate)),
            "respiratory_rate": round(float(baseline.respiratory_rate), 1),
            "stress_score": int(round(baseline.stress_score)),
            "systolic_bp": int(round(raw.systolic_bp)),
            "diastolic_bp": int(round(raw.diastolic_bp)),
            "spo2": int(round(baseline.spo2)),
            "hrv_rmssd_morning": int(round(baseline.hrv_rmssd_morning)),
            "ecg_rhythm": baseline.ecg_rhythm,
        },
    }


def lab_results_to_json(profile: PatientProfile) -> dict | None:
    if not profile.lab_results:
        return None
    lab = profile.lab_results
    return {
        "patient_id": profile.patient_id,
        "mimic_subject_id": profile.mimic_subject_id,
        **lab,
    }


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
    parser.add_argument("--duration-hours", type=int, help="Optional override for config duration_hours.")
    parser.add_argument("--seed", type=int, help="Optional override for config Monte Carlo seed.")
    return parser


def generate_patient_simulation(config) -> dict[str, Path]:
    profile = load_profile_for_run(config)
    start_time = parse_utc_datetime(config.start_time)
    master_timeline, sleep_sessions = build_master_timeline(
        profile=profile,
        start_time=start_time,
        duration_seconds=config.duration_seconds,
        seed=config.seed,
    )

    # Output paths
    patient_info_path = config.output_path("patient_info")
    lab_results_path = config.output_path("lab_results")
    continuous_path = config.output_path("wearable_continuous")
    steps_path = config.output_path("wearable_steps_event")
    stress_path = config.output_path("wearable_stress")
    ppi_batch_path = config.output_path("wearable_ppi_batch")
    motion_batch_path = config.output_path("wearable_motion_batch")
    bp_path = config.output_path("wearable_bp_triggered")
    spo2_path = config.output_path("wearable_spo2_triggered")
    battery_path = config.output_path("wearable_battery")
    ecg_path = config.output_path("wearable_ecg_triggered")
    fault_log_path = config.output_path("wearable_fault_log")
    sleep_path = config.output_path("sleep_timeline")
    daily_path = config.output_path("daily_metrics")
    activity_timeline_path = config.output_path("activity_timeline")
    abnormal_episodes_path = config.output_path("abnormal_episodes")

    # Static outputs
    write_json(patient_info_path, patient_info_to_json(profile))
    lab_data = lab_results_to_json(profile)
    if lab_data is not None:
        write_json(lab_results_path, lab_data)

    # Run full simulation once (single pass)
    sim_records = run_wearable_simulation(
        profile=profile,
        master_timeline=master_timeline,
        start_time=start_time,
        duration_seconds=config.duration_seconds,
        wearable_config=config.wearable,
        seed=config.seed,
    )

    # Derive all streams from sim_records
    continuous_records = list(generate_continuous_records(profile, sim_records))
    steps_records = list(generate_steps_records(profile, sim_records))
    stress_records = list(generate_stress_records(profile, sim_records))
    ppi_batch_records = list(generate_ppi_batch_records(profile, sim_records))
    motion_batch_records = list(generate_motion_batch_records(
        profile, sim_records, config.wearable, config.seed + 2000,
    ))
    battery_records = generate_battery_records(
        profile, start_time, config.duration_seconds, config.wearable, config.seed + 500,
    )
    bp_records = generate_bp_records(
        profile=profile,
        start_time=start_time,
        duration_seconds=config.duration_seconds,
        wearable_config=config.wearable,
        seed=config.seed + 50,
        sim_records=sim_records,
    )
    spo2_records = generate_spo2_records(
        profile=profile,
        start_time=start_time,
        duration_seconds=config.duration_seconds,
        wearable_config=config.wearable,
        seed=config.seed + 100,
        sim_records=sim_records,
    )
    ecg_records = generate_ecg_records(
        profile=profile,
        start_time=start_time,
        duration_seconds=config.duration_seconds,
        wearable_config=config.wearable,
        seed=config.seed + 200,
    )

    # Fault injection
    fault_log = []
    if config.wearable_fault_injector.get("enabled", False):
        continuous_records, fl = inject_wearable_faults(
            records=continuous_records, stream_name="wearable_continuous",
            config=config.wearable_fault_injector, seed=config.seed + 1000,
        )
        fault_log.extend(fl)
        steps_records, fl = inject_wearable_faults(
            records=steps_records, stream_name="wearable_steps_event",
            config=config.wearable_fault_injector, seed=config.seed + 1010,
        )
        fault_log.extend(fl)
        stress_records, fl = inject_wearable_faults(
            records=stress_records, stream_name="wearable_stress",
            config=config.wearable_fault_injector, seed=config.seed + 1020,
        )
        fault_log.extend(fl)
        ppi_batch_records, fl = inject_wearable_faults(
            records=ppi_batch_records, stream_name="wearable_ppi_batch",
            config=config.wearable_fault_injector, seed=config.seed + 1030,
        )
        fault_log.extend(fl)
        motion_batch_records, fl = inject_wearable_faults(
            records=motion_batch_records, stream_name="wearable_motion_batch",
            config=config.wearable_fault_injector, seed=config.seed + 1040,
        )
        fault_log.extend(fl)
        battery_records, fl = inject_wearable_faults(
            records=battery_records, stream_name="wearable_battery",
            config=config.wearable_fault_injector, seed=config.seed + 1045,
        )
        fault_log.extend(fl)
        bp_records, fl = inject_wearable_faults(
            records=bp_records, stream_name="wearable_bp_triggered",
            config=config.wearable_fault_injector, seed=config.seed + 1050,
        )
        fault_log.extend(fl)
        spo2_records, fl = inject_wearable_faults(
            records=spo2_records, stream_name="wearable_spo2_triggered",
            config=config.wearable_fault_injector, seed=config.seed + 1100,
        )
        fault_log.extend(fl)
        ecg_records, fl = inject_wearable_faults(
            records=ecg_records, stream_name="wearable_ecg_triggered",
            config=config.wearable_fault_injector, seed=config.seed + 1200,
        )
        fault_log.extend(fl)
        write_json(fault_log_path, fault_log)

    # Write all streams
    continuous_count = write_jsonl(continuous_path, continuous_records)
    write_jsonl(steps_path, steps_records)
    write_jsonl(stress_path, stress_records)
    write_jsonl(ppi_batch_path, ppi_batch_records)
    write_jsonl(motion_batch_path, motion_batch_records)
    write_jsonl(bp_path, bp_records)
    write_jsonl(spo2_path, spo2_records)
    write_jsonl(battery_path, battery_records)
    write_jsonl(ecg_path, ecg_records)
    write_json(sleep_path, sleep_sessions_to_json(profile.patient_id, sleep_sessions))
    write_json(activity_timeline_path, activity_timeline_to_json(profile.patient_id, master_timeline))
    write_json(abnormal_episodes_path, extract_abnormal_episodes(profile, sim_records))
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

    print(f"Config:              {config.config_path}")
    print(f"patient_info:        {patient_info_path}")
    if lab_data is not None:
        print(f"lab_results:         {lab_results_path}")
    print(f"continuous (1Hz):    {continuous_path} ({continuous_count} records)")
    print(f"steps (60s):         {steps_path} ({len(steps_records)} records)")
    print(f"stress (60s):        {stress_path} ({len(stress_records)} records)")
    print(f"ppi_batch (60s):     {ppi_batch_path} ({len(ppi_batch_records)} records)")
    print(f"motion_batch (10Hz): {motion_batch_path} ({len(motion_batch_records)} windows)")
    print(f"bp_triggered:        {bp_path} ({len(bp_records)} records)")
    print(f"spo2_triggered:      {spo2_path} ({len(spo2_records)} records)")
    print(f"battery (30min):     {battery_path} ({len(battery_records)} records)")
    print(f"ecg_triggered:       {ecg_path} ({len(ecg_records)} records)")
    if config.wearable_fault_injector.get("enabled", False):
        print(f"fault_log:           {fault_log_path} ({len(fault_log)} faults)")
    print(f"sleep_timeline:      {sleep_path}")
    print(f"daily_metrics:       {daily_path}")
    print(f"activity_timeline:   {activity_timeline_path} ({len(master_timeline)} segments)")
    print(f"abnormal_episodes:   {abnormal_episodes_path}")

    return {
        "patient_info": patient_info_path,
        "lab_results": lab_results_path,
        "wearable_continuous": continuous_path,
        "wearable_steps_event": steps_path,
        "wearable_stress": stress_path,
        "wearable_ppi_batch": ppi_batch_path,
        "wearable_motion_batch": motion_batch_path,
        "wearable_bp_triggered": bp_path,
        "wearable_spo2_triggered": spo2_path,
        "wearable_battery": battery_path,
        "wearable_ecg_triggered": ecg_path,
        "wearable_fault_log": fault_log_path,
        "sleep_timeline": sleep_path,
        "daily_metrics": daily_path,
        "activity_timeline": activity_timeline_path,
        "abnormal_episodes": abnormal_episodes_path,
    }


def main() -> None:
    args = build_arg_parser().parse_args()
    config = with_overrides(
        load_generation_config(args.config),
        patient_id=args.patient_id,
        start_time=args.start_time,
        duration_hours=args.duration_hours,
        seed=args.seed,
        output_dir=args.output_dir,
    )
    generate_patient_simulation(config)


if __name__ == "__main__":
    main()
