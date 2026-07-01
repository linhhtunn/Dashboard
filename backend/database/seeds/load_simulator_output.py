"""
Load all simulator output files (output/abnormal/P001..P010) into Supabase + TigerDB.

Usage:
    python -m database.seeds.load_simulator_output
    python -m database.seeds.load_simulator_output --output-dir path/to/abnormal --patients P001 P002
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from database.repositories.app_repository import SupabaseAppRepository
from database.repositories.timeseries_repository import TimescaleRepository
from database.schemas.app import (
    AbnormalEpisodeLog,
    DeviceCreate,
    PatientCreate,
    WearableFaultLog,
)
from database.schemas.timeseries import (
    ActivityTimelineSegment,
    DailyHrvMetrics,
    EcgMeasurement,
    MotionBatch,
    PpiPatch,
    SleepSession,
    SleepStageInterval,
    WearableContinuous,
    WearableInterval,
    WearableMeasurement,
)

DEFAULT_OUTPUT_DIR = Path(__file__).parents[2] / "simulator" / "output" / "abnormal"


# ─── helpers ────────────────────────────────────────────────────────────────

def _parse_dt(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))

def _read_json(path: Path) -> dict | list:
    with path.open(encoding="utf-8") as f:
        return json.load(f)

def _read_jsonl(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]

def _utc_now() -> datetime:
    return datetime.now(timezone.utc)

def _safe_int(val: object, lo: int, hi: int) -> int | None:
    """Return val if it's an int within [lo, hi], else None (fault-injected outlier)."""
    if val is None or not isinstance(val, (int, float)):
        return None
    v = int(val)
    return v if lo <= v <= hi else None

# Each chunk is inserted in its own transaction so a huge insert (e.g. ~86k
# continuous samples) doesn't hold one connection long enough for the cloud
# server to drop it ("server closed the connection unexpectedly").
INSERT_CHUNK_SIZE = 5000

def _chunked_insert(insert_fn, items: list, chunk_size: int = INSERT_CHUNK_SIZE) -> int:
    total = 0
    for i in range(0, len(items), chunk_size):
        total += insert_fn(items[i:i + chunk_size])
    return total


# ─── Supabase loaders ────────────────────────────────────────────────────────

def load_patient(patient_dir: Path, repo: SupabaseAppRepository) -> str:
    info = _read_json(patient_dir / "patient_info.json")
    patient = PatientCreate(
        patient_id=info["patient_id"],
        mimic_subject_id=info.get("mimic_subject_id"),
        name=info["name"],
        age=info.get("age"),
        height_cm=info.get("height_cm"),
        weight_kg=info.get("weight_kg"),
        gender=info.get("gender"),
        age_group=info.get("age_group"),
        pregnancy_status=info.get("pregnancy_status"),
        lifestyle=info.get("lifestyle"),
        risk_factors=info.get("risk_factors", []),
        activity_level=info.get("activity_level"),
        medical_history=info.get("medical_history"),
        health_status=info.get("health_status"),
        baseline_signals=info.get("baseline_signals", {}),
    )
    repo.upsert_patients([patient])

    device = DeviceCreate(
        device_id=info["device_id"],
        patient_id=info["patient_id"],
        device_type="simulator",
    )
    repo.upsert_devices([device])
    return info["patient_id"]


def load_lab_results(patient_dir: Path, repo: SupabaseAppRepository, patient_id: str) -> int:
    lab_path = patient_dir / "lab_results.json"
    if not lab_path.exists():
        return 0
    raw = _read_json(lab_path)
    sampled_at = raw["sampled_at"]
    PANEL_TYPES = {"chemistry", "hematology", "coagulation"}
    rows: list[PatientLabResultCreate] = []
    for panel, tests in raw.items():
        if panel not in PANEL_TYPES or not isinstance(tests, dict):
            continue
        for test_name, value in tests.items():
            rows.append(PatientLabResultCreate(
                lab_result_id=f"{patient_id}_{panel}_{test_name}",
                patient_id=patient_id,
                sampled_at=sampled_at,
                panel_type=panel,
                test_name=test_name,
                value_numeric=float(value) if isinstance(value, (int, float)) else None,
                value_text=str(value) if not isinstance(value, (int, float)) else None,
            ))
    repo.upsert_patient_lab_results(rows)
    return len(rows)


# ─── TigerDB loaders ─────────────────────────────────────────────────────────

def load_continuous(patient_dir: Path, repo: TimescaleRepository, device_id: str) -> int:
    pid = patient_dir.name
    records = _read_jsonl(patient_dir / "continuous.jsonl")
    samples = [
        WearableContinuous(
            time=_parse_dt(r["timestamp"]),
            message_id=r["message_id"],
            patient_id=r.get("patient_id", pid),
            device_id=r.get("device_id", device_id),
            heart_rate=_safe_int(r.get("heart_rate"), 20, 260),
            respiratory_rate=_safe_int(r.get("respiratory_rate"), 4, 60),
        )
        for r in records if r.get("timestamp")
    ]
    return _chunked_insert(repo.insert_wearable_continuous, samples)


def load_steps_and_stress(patient_dir: Path, repo: TimescaleRepository) -> int:
    pid = patient_dir.name
    total = 0
    for filename, interval_type in [("steps_event.jsonl", "steps"), ("stress.jsonl", "stress")]:
        path = patient_dir / filename
        if not path.exists():
            continue
        records = _read_jsonl(path)
        intervals = []
        for r in records:
            if not r.get("timestamp"):
                continue
            ts = _parse_dt(r["timestamp"])
            interval_seconds = r.get("interval_seconds", 60)
            window_end = ts
            window_start = ts - timedelta(seconds=interval_seconds)
            intervals.append(WearableInterval(
                time=ts,
                window_start=window_start,
                window_end=window_end,
                message_id=r["message_id"],
                patient_id=r.get("patient_id", pid),
                device_id=r.get("device_id", f"SIM_WATCH_{pid}"),
                interval_type=interval_type,
                interval_seconds=interval_seconds,
                steps_count=_safe_int(r.get("steps_count"), 0, 10**9),
                steps_rate_per_min=_safe_int(r.get("steps_rate_per_min"), 0, 10**9),
                activity_type=r.get("activity_type"),
                stress_score=_safe_int(r.get("stress_score"), 0, 100),
                stress_level=r.get("stress_level"),
            ))
        total += _chunked_insert(repo.insert_wearable_intervals, intervals)
    return total


def load_ppi_patches(patient_dir: Path, repo: TimescaleRepository) -> int:
    pid = patient_dir.name
    records = _read_jsonl(patient_dir / "ppi_batch.jsonl")
    patches = [
        PpiPatch(
            time=_parse_dt(r["timestamp"]),
            window_start=_parse_dt(r["window_start"]),
            window_end=_parse_dt(r["window_end"]),
            message_id=r["message_id"],
            patient_id=r.get("patient_id", pid),
            device_id=r.get("device_id", f"SIM_WATCH_{pid}"),
            interval_seconds=r.get("interval_seconds", 15),
            ppi_intervals_ms=r.get("ppi_intervals_ms", []),
        )
        for r in records if r.get("timestamp") and r.get("window_start") and r.get("window_end")
    ]
    return _chunked_insert(repo.insert_ppi_patches, patches)


def load_measurements(patient_dir: Path, repo: TimescaleRepository) -> int:
    pid = patient_dir.name
    total = 0
    for filename, mtype, fields in [
        ("bp_triggered.jsonl",   "blood_pressure", ["systolic_bp", "diastolic_bp"]),
        ("spo2_triggered.jsonl", "spo2",           ["spo2"]),
        ("battery.jsonl",        "battery",        ["battery_level"]),
    ]:
        path = patient_dir / filename
        if not path.exists():
            continue
        records = _read_jsonl(path)
        measurements = [
            WearableMeasurement(
                time=_parse_dt(r["timestamp"]),
                message_id=r["message_id"],
                patient_id=r.get("patient_id", pid),
                device_id=r.get("device_id", f"SIM_WATCH_{pid}"),
                measurement_type=mtype,
                systolic_bp=_safe_int(r.get("systolic_bp"), 60, 260),
                diastolic_bp=_safe_int(r.get("diastolic_bp"), 30, 180),
                spo2=_safe_int(r.get("spo2"), 0, 100),
                battery_level=_safe_int(r.get("battery_level"), 0, 100),
            )
            for r in records if r.get("timestamp")
        ]
        total += _chunked_insert(repo.insert_wearable_measurements, measurements)
    return total


def load_motion(patient_dir: Path, repo: TimescaleRepository) -> int:
    pid = patient_dir.name
    records = _read_jsonl(patient_dir / "motion_batch.jsonl")
    batches = []
    for r in records:
        if not (r.get("timestamp") and r.get("window_start") and r.get("window_end")):
            continue
        window_start = _parse_dt(r["window_start"])
        window_end = _parse_dt(r["window_end"])
        # Simulator emits window_end == window_start for 1-second motion batches;
        # derive the real end from the sample count and sampling rate.
        if window_end <= window_start:
            points = r.get("motion_points", [])
            rate = r.get("motion_sampling_rate_hz") or 10
            window_end = window_start + timedelta(seconds=max(len(points), 1) / rate)
        batches.append(MotionBatch(
            time=_parse_dt(r["timestamp"]),
            window_start=window_start,
            window_end=window_end,
            message_id=r["message_id"],
            patient_id=r.get("patient_id", pid),
            device_id=r.get("device_id", f"SIM_WATCH_{pid}"),
            motion_sampling_rate_hz=r["motion_sampling_rate_hz"],
            motion_points=r.get("motion_points", []),
        ))
    # Motion rows carry large JSONB point arrays; use a smaller chunk so the
    # cloud server doesn't drop the connection on an oversized statement.
    return _chunked_insert(repo.insert_motion_batches, batches, chunk_size=500)


def load_ecg(patient_dir: Path, repo: TimescaleRepository) -> int:
    pid = patient_dir.name
    records = _read_jsonl(patient_dir / "ecg_triggered.jsonl")
    measurements = [
        EcgMeasurement(
            measurement_id=r["message_id"],
            time=_parse_dt(r["timestamp"]),
            message_id=r["message_id"],
            patient_id=r.get("patient_id", pid),
            device_id=r.get("device_id", f"SIM_WATCH_{pid}"),
            ecg_rhythm=r.get("ecg_rhythm"),
            ecg_lead=r.get("ecg_lead"),
            ecg_unit=r.get("ecg_unit"),
            ecg_sampling_rate_hz=r.get("ecg_sampling_rate_hz"),
            ecg_duration_seconds=r.get("ecg_duration_seconds"),
            ecg_points=r.get("ecg_points", []),
        )
        for r in records if r.get("timestamp")
    ]
    return _chunked_insert(repo.insert_ecg_measurements, measurements)


def load_sleep(patient_dir: Path, repo: TimescaleRepository, patient_id: str, device_id: str) -> int:
    sleep_path = patient_dir / "sleep_timeline.json"
    if not sleep_path.exists():
        return 0
    sessions_raw = _read_json(sleep_path)
    if not isinstance(sessions_raw, list):
        sessions_raw = [sessions_raw]

    sessions: list[SleepSession] = []
    stages: list[SleepStageInterval] = []
    for s in sessions_raw:
        session_id = f"{patient_id}_{s['date']}"
        start = _parse_dt(s["start_time"])
        duration_min = s["sleep_duration_min"]
        end_dt = datetime.fromtimestamp(start.timestamp() + duration_min * 60, tz=timezone.utc)
        sessions.append(SleepSession(
            sleep_session_id=session_id,
            patient_id=patient_id,
            device_id=device_id,
            sleep_date=s["date"],
            start_time=start,
            end_time=end_dt,
            sleep_duration_min=duration_min,
            detail=s.get("detail", []),
        ))
        cursor = start
        for i, seg in enumerate(s.get("detail", [])):
            seg_end = datetime.fromtimestamp(cursor.timestamp() + seg["duration_min"] * 60, tz=timezone.utc)
            stages.append(SleepStageInterval(
                stage_id=f"{session_id}_seg{i:03d}",
                sleep_session_id=session_id,
                patient_id=patient_id,
                device_id=device_id,
                start_time=cursor,
                end_time=seg_end,
                state=seg["state"],
                duration_min=seg["duration_min"],
            ))
            cursor = seg_end

    repo.upsert_sleep_sessions(sessions)
    repo.upsert_sleep_stage_intervals(stages)
    return len(sessions)


def load_daily_metrics(patient_dir: Path, repo: TimescaleRepository, patient_id: str) -> int:
    path = patient_dir / "daily_metrics.json"
    if not path.exists():
        return 0
    raw = _read_json(path)
    metric = DailyHrvMetrics(
        patient_id=patient_id,
        date=raw["date"],
        measured_at=_parse_dt(raw["measured_at"]),
        hrv_rmssd_morning=raw["hrv_rmssd_morning"],
    )
    repo.upsert_daily_hrv_metrics([metric])
    return 1


def load_activity_timeline(patient_dir: Path, repo: TimescaleRepository, device_id: str) -> int:
    path = patient_dir / "activity_timeline.json"
    if not path.exists():
        return 0
    segments_raw = _read_json(path)
    segments = [
        ActivityTimelineSegment(
            time=_parse_dt(seg["start_time"]),
            patient_id=seg["patient_id"],
            device_id=device_id,
            kind=seg["kind"],
            state=seg["state"],
            start_time=_parse_dt(seg["start_time"]),
            end_time=_parse_dt(seg["end_time"]),
            duration_minutes=seg["duration_minutes"],
        )
        for seg in segments_raw
    ]
    return repo.insert_activity_timeline_segments(segments)


def load_abnormal_episodes(patient_dir: Path, repo: SupabaseAppRepository, device_id: str) -> int:
    path = patient_dir / "abnormal_episodes.json"
    if not path.exists():
        return 0
    raw = _read_json(path)
    patient_id = raw["patient_id"]
    episodes = [
        AbnormalEpisodeLog(
            episode_id=f"{patient_id}_{ep['episode_type']}_{ep['start_time'].replace(':', '').replace('-', '')}",
            patient_id=patient_id,
            device_id=device_id,
            episode_type=ep["episode_type"],
            start_time=_parse_dt(ep["start_time"]),
            end_time=_parse_dt(ep["end_time"]),
            duration_seconds=ep["duration_seconds"],
            duration_minutes=ep["duration_minutes"],
            peak_heart_rate=ep.get("peak_heart_rate"),
            min_heart_rate=ep.get("min_heart_rate"),
            systolic_bp_delta_min=ep.get("systolic_bp_delta_min"),
            systolic_bp_delta_max=ep.get("systolic_bp_delta_max"),
            diastolic_bp_delta_min=ep.get("diastolic_bp_delta_min"),
            diastolic_bp_delta_max=ep.get("diastolic_bp_delta_max"),
            spo2_delta_min=ep.get("spo2_delta_min"),
            spo2_delta_max=ep.get("spo2_delta_max"),
            severity=ep.get("severity"),
            status=ep.get("status", "abnormal"),
        )
        for ep in raw.get("episodes", [])
    ]
    return repo.insert_abnormal_episodes(episodes)


def load_fault_log(patient_dir: Path, repo: SupabaseAppRepository, device_id: str) -> int:
    path = patient_dir / "fault_log.json"
    if not path.exists():
        return 0
    faults_raw = _read_json(path)
    if not isinstance(faults_raw, list):
        return 0
    faults = [
        WearableFaultLog(
            occurred_at=_parse_dt(f["timestamp"]) if f.get("timestamp") else _utc_now(),
            patient_id=f["patient_id"],
            device_id=device_id,
            stream_name=f["stream"],
            fault_type=f["fault_type"],
            source_message_id=f.get("source_message_id"),
            detail=f.get("detail"),
        )
        for f in faults_raw if f.get("patient_id")
    ]
    return repo.insert_fault_log(faults)


# ─── main ─────────────────────────────────────────────────────────────────────

def load_patient_dir(patient_dir: Path, app_repo: SupabaseAppRepository, ts_repo: TimescaleRepository) -> None:
    patient_id = load_patient(patient_dir, app_repo)
    device_id = f"SIM_WATCH_{patient_id}"

    # Wipe existing TigerDB rows so re-seeding always reflects the latest simulator output.
    ts_repo.clean_patient_timeseries(patient_id)

    cont_count    = load_continuous(patient_dir, ts_repo, device_id)
    intv_count    = load_steps_and_stress(patient_dir, ts_repo)
    ppi_count     = load_ppi_patches(patient_dir, ts_repo)
    meas_count    = load_measurements(patient_dir, ts_repo)
    motion_count  = load_motion(patient_dir, ts_repo)
    ecg_count     = load_ecg(patient_dir, ts_repo)
    _             = load_sleep(patient_dir, ts_repo, patient_id, device_id)
    _             = load_daily_metrics(patient_dir, ts_repo, patient_id)
    seg_count     = load_activity_timeline(patient_dir, ts_repo, device_id)
    ep_count      = load_abnormal_episodes(patient_dir, app_repo, device_id)
    fault_count   = load_fault_log(patient_dir, app_repo, device_id)

    print(
        f"[{patient_id}] cont={cont_count} intervals={intv_count} "
        f"ppi={ppi_count} meas={meas_count} motion={motion_count} ecg={ecg_count} "
        f"timeline={seg_count} episodes={ep_count} faults={fault_count}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Load simulator output into Supabase + TigerDB.")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--patients", nargs="*", help="e.g. P001 P002 (default: all)")
    args = parser.parse_args()

    output_dir: Path = args.output_dir
    if not output_dir.exists():
        raise SystemExit(f"Output dir not found: {output_dir}")

    patient_dirs = sorted(
        [d for d in output_dir.iterdir() if d.is_dir() and (d / "patient_info.json").exists()]
    )
    if args.patients:
        patient_dirs = [d for d in patient_dirs if d.name in args.patients]

    app_repo = SupabaseAppRepository()
    ts_repo  = TimescaleRepository()

    print(f"Loading {len(patient_dirs)} patient(s) from {output_dir}\n")
    for patient_dir in patient_dirs:
        load_patient_dir(patient_dir, app_repo, ts_repo)

    print("\nDone.")


if __name__ == "__main__":
    main()
