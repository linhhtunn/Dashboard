from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from database.repositories import SupabaseAppRepository, TimescaleRepository
from database.schemas.app import AlertContextCreate, AlertCreate, DeviceCreate, DeviceSensorCreate, PatientCreate
from database.schemas.timeseries import (
    DailyHrvMetrics,
    EcgMeasurement,
    HealthFeature,
    LatestSensorValue,
    MotionBatch,
    PpiPatch,
    RawSensorEvent,
    SleepSession,
    SleepStageInterval,
    WearableContinuous,
    WearableInterval,
    WearableMeasurement,
)


def _require_yes(yes: bool) -> None:
    if not yes:
        raise SystemExit("Refusing to insert smoke-test data without --yes")


def smoke_supabase() -> dict[str, int]:
    repo = SupabaseAppRepository()
    patient = PatientCreate(
        patient_id="TEST_DB_P001",
        mimic_subject_id=999001,
        name="Database Smoke Test",
        age=30,
        gender="unknown",
        health_status="NORMAL",
        baseline_signals={"heart_rate": 72, "spo2": 98},
    )
    device = DeviceCreate(
        device_id="TEST_DB_DEVICE_001",
        patient_id=patient.patient_id,
        device_type="simulator",
        vendor="health-app-test",
        model="test-v1",
        external_device_key="TEST_DB_DEVICE_001",
    )
    sensor = DeviceSensorCreate(
        sensor_id="TEST_DB_SENSOR_HR",
        device_id=device.device_id,
        sensor_type="heart_rate",
        label="Heart rate",
        unit="bpm",
        stream_name="wearable_continuous",
        sampling_mode="continuous",
    )
    alert_time = datetime.now(timezone.utc)
    alert = AlertCreate(
        alert_id=f"TEST_DB_ALERT_{int(alert_time.timestamp())}",
        patient_id=patient.patient_id,
        device_id=device.device_id,
        sensor_id=sensor.sensor_id,
        alert_type="smoke_test",
        severity="low",
        alert_time=alert_time,
        reason="Database smoke test alert",
        dedup_key=f"smoke_test_{int(alert_time.timestamp())}",
    )
    context = AlertContextCreate(
        alert_id=alert.alert_id,
        patient_id=patient.patient_id,
        window_start=alert_time - timedelta(minutes=5),
        window_end=alert_time + timedelta(minutes=5),
        summary={"smoke_test": True},
    )
    return {
        "patients": repo.upsert_patients([patient]),
        "devices": repo.upsert_devices([device]),
        "device_sensors": repo.upsert_device_sensors([sensor]),
        "alerts": 1 if repo.create_alert(alert, context) is None else 0,
    }


def smoke_tigerdata() -> dict[str, int]:
    repo = TimescaleRepository()
    now = datetime.now(timezone.utc).replace(microsecond=0)
    patient_id = "TEST_DB_P001"
    device_id = "TEST_DB_DEVICE_001"
    sleep_session_id = f"TEST_SLEEP_{int(now.timestamp())}"
    counts = {
        "raw_sensor_events": repo.insert_raw_events(
            [
                RawSensorEvent(
                    time=now,
                    message_id=f"raw_{int(now.timestamp())}",
                    patient_id=patient_id,
                    device_id=device_id,
                    stream_name="wearable_continuous",
                    raw_payload={"smoke_test": True},
                )
            ]
        ),
        "wearable_continuous": repo.insert_wearable_continuous(
            [
                WearableContinuous(
                    time=now,
                    message_id=f"continuous_{int(now.timestamp())}",
                    patient_id=patient_id,
                    device_id=device_id,
                    heart_rate=72,
                    respiratory_rate=16,
                )
            ]
        ),
        "wearable_intervals": repo.insert_wearable_intervals(
            [
                WearableInterval(
                    time=now,
                    window_start=now - timedelta(seconds=60),
                    window_end=now,
                    message_id=f"interval_{int(now.timestamp())}",
                    patient_id=patient_id,
                    device_id=device_id,
                    interval_type="stress",
                    stress_score=30,
                    stress_level="low",
                )
            ]
        ),
        "ppi_patches": repo.insert_ppi_patches(
            [
                PpiPatch(
                    time=now,
                    window_start=now - timedelta(seconds=15),
                    window_end=now,
                    message_id=f"ppi_{int(now.timestamp())}",
                    patient_id=patient_id,
                    device_id=device_id,
                    interval_seconds=15,
                    ppi_intervals_ms=[800, 812, 790, 805],
                )
            ]
        ),
        "wearable_measurements": repo.insert_wearable_measurements(
            [
                WearableMeasurement(
                    time=now,
                    message_id=f"measurement_{int(now.timestamp())}",
                    patient_id=patient_id,
                    device_id=device_id,
                    measurement_type="spo2",
                    spo2=98,
                )
            ]
        ),
        "motion_batches": repo.insert_motion_batches(
            [
                MotionBatch(
                    time=now,
                    window_start=now - timedelta(seconds=10),
                    window_end=now,
                    message_id=f"motion_{int(now.timestamp())}",
                    patient_id=patient_id,
                    device_id=device_id,
                    motion_sampling_rate_hz=5,
                    motion_points=[{"t_ms": 0, "acc_x": 0, "acc_y": 0, "acc_z": 1, "gyro_x": 0, "gyro_y": 0, "gyro_z": 0}],
                )
            ]
        ),
        "ecg_measurements": repo.insert_ecg_measurements(
            [
                EcgMeasurement(
                    measurement_id=f"ecg_{int(now.timestamp())}",
                    time=now,
                    message_id=f"ecg_msg_{int(now.timestamp())}",
                    patient_id=patient_id,
                    device_id=device_id,
                    ecg_result="normal",
                    ecg_rhythm="sinus_rhythm",
                    ecg_points=[{"t_ms": 0, "value": 0.01}],
                )
            ]
        ),
        "sleep_sessions": repo.upsert_sleep_sessions(
            [
                SleepSession(
                    sleep_session_id=sleep_session_id,
                    patient_id=patient_id,
                    device_id=device_id,
                    sleep_date=date.today(),
                    start_time=now - timedelta(hours=8),
                    end_time=now,
                    sleep_duration_min=480,
                    sleep_score=80,
                    sleep_quality="good",
                    detail=[{"state": "light", "duration_min": 60}],
                )
            ]
        ),
        "sleep_stage_intervals": repo.upsert_sleep_stage_intervals(
            [
                SleepStageInterval(
                    stage_id=f"{sleep_session_id}_STAGE_001",
                    sleep_session_id=sleep_session_id,
                    patient_id=patient_id,
                    device_id=device_id,
                    start_time=now - timedelta(hours=8),
                    end_time=now - timedelta(hours=7),
                    state="light",
                    duration_min=60,
                )
            ]
        ),
        "daily_hrv_metrics": repo.upsert_daily_hrv_metrics(
            [DailyHrvMetrics(patient_id=patient_id, date=date.today(), measured_at=now, hrv_rmssd_morning=45)]
        ),
        "health_features": repo.insert_health_features(
            [
                HealthFeature(
                    time=now,
                    patient_id=patient_id,
                    device_id=device_id,
                    feature_window="5min",
                    source_window_start=now - timedelta(minutes=5),
                    source_window_end=now,
                    avg_heart_rate=72,
                    min_spo2=98,
                    features={"smoke_test": True},
                )
            ]
        ),
        "latest_sensor_values": repo.upsert_latest_values(
            [
                LatestSensorValue(
                    patient_id=patient_id,
                    device_id=device_id,
                    metric="heart_rate",
                    value_numeric=72,
                    unit="bpm",
                    last_measured_at=now,
                    stream_name="wearable_continuous",
                )
            ]
        ),
    }
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description="Insert minimal smoke-test rows after migrations are applied.")
    parser.add_argument("--database", choices=["supabase", "tigerdata"], required=True)
    parser.add_argument("--yes", action="store_true", help="Required because this inserts test data.")
    args = parser.parse_args()
    _require_yes(args.yes)
    result = smoke_supabase() if args.database == "supabase" else smoke_tigerdata()
    print(json.dumps({"database": args.database, "inserted_or_attempted": result}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
