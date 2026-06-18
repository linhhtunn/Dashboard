from __future__ import annotations

from copy import deepcopy
from typing import Any


class FixtureNotFoundError(LookupError):
    """Raised when a fixed Sprint 1 fixture does not exist."""


PATIENT_FIXTURES: dict[str, dict[str, Any]] = {
    "P001": {
        "patient_id": "P001",
        "name": "Nguyen Van A",
        "age": 72,
        "gender": "Nam",
        "medical_history": "Tang huyet ap, tien su nga nhe trong thang gan day.",
        "health_status": "WARNING",
        "recent_vitals": [
            {
                "timestamp": "2026-05-28T10:04:55Z",
                "heart_rate": 78,
                "hrv": 42,
                "systolic_bp": 128,
                "diastolic_bp": 82,
                "spo2": 98,
                "activity_state": "standing",
                "status": "NORMAL",
            },
            {
                "timestamp": "2026-05-28T10:05:00Z",
                "heart_rate": 112,
                "hrv": 31,
                "systolic_bp": 136,
                "diastolic_bp": 86,
                "spo2": 97,
                "activity_state": "impact_detected",
                "status": "ABNORMAL",
            },
            {
                "timestamp": "2026-05-28T10:05:05Z",
                "heart_rate": 95,
                "hrv": 35,
                "systolic_bp": 132,
                "diastolic_bp": 84,
                "spo2": 97,
                "activity_state": "low_movement",
                "status": "WARNING",
            },
        ],
        "recent_alerts": [
            {
                "alert_id": "ALT_FALL_0092",
                "alert_type": "fall_detected",
                "severity": "HIGH",
                "confidence": 0.94,
                "message": "Phat hien cu nga dot ngot kem bat dong ngan sau va cham.",
            }
        ],
    },
    "P002": {
        "patient_id": "P002",
        "name": "Tran Thi B",
        "age": 64,
        "gender": "Nu",
        "medical_history": "Theo doi tang huyet ap va nhip tim nhanh khi van dong.",
        "health_status": "ABNORMAL",
        "recent_vitals": [
            {
                "timestamp": "2026-05-28T09:59:00Z",
                "heart_rate": 92,
                "hrv": 38,
                "systolic_bp": 154,
                "diastolic_bp": 94,
                "spo2": 96,
                "activity_state": "resting",
                "status": "WARNING",
            },
            {
                "timestamp": "2026-05-28T10:00:00Z",
                "heart_rate": 108,
                "hrv": 30,
                "systolic_bp": 168,
                "diastolic_bp": 102,
                "spo2": 95,
                "activity_state": "resting",
                "status": "ABNORMAL",
            },
        ],
        "recent_alerts": [
            {
                "alert_id": "ALT_BP_0031",
                "alert_type": "blood_pressure_abnormal",
                "severity": "MEDIUM",
                "confidence": 0.88,
                "message": "Huyet ap tang vuot nguong theo doi trong trang thai nghi.",
            }
        ],
    },
    "P003": {
        "patient_id": "P003",
        "name": "Nguyen Van A",
        "age": 58,
        "gender": "Nam",
        "medical_history": "Theo doi rung nhi va tang huyet ap.",
        "health_status": "NORMAL",
        "recent_vitals": [
            {
                "timestamp": "2026-05-28T10:02:00Z",
                "heart_rate": 84,
                "hrv": 40,
                "systolic_bp": 132,
                "diastolic_bp": 84,
                "spo2": 97,
                "activity_state": "resting",
                "status": "NORMAL",
            }
        ],
        "recent_alerts": [],
    },
}


ALERT_FIXTURES: dict[str, dict[str, Any]] = {
    "ALT_FALL_0092": {
        "alert_id": "ALT_FALL_0092",
        "patient_id": "P001",
        "timestamp": "2026-05-28T10:05:03Z",
        "alert_type": "fall_detected",
        "health_status": "ABNORMAL",
        "severity": "HIGH",
        "confidence": 0.94,
        "message": "Phat hien cu nga dot ngot cua benh nhan P001.",
        "evidence": {
            "peak_acceleration": 4.8,
            "post_event_movement_level": 0.05,
            "event_window_seconds": 5,
        },
        "sensor_context": [
            {
                "timestamp": "2026-05-28T10:04:55Z",
                "heart_rate": 78,
                "spo2": 98,
                "acc_magnitude": 1.1,
                "movement_level": 0.62,
                "status": "NORMAL",
            },
            {
                "timestamp": "2026-05-28T10:05:00Z",
                "heart_rate": 112,
                "spo2": 97,
                "acc_magnitude": 4.8,
                "movement_level": 0.91,
                "status": "ABNORMAL",
            },
            {
                "timestamp": "2026-05-28T10:05:05Z",
                "heart_rate": 95,
                "spo2": 97,
                "acc_magnitude": 0.3,
                "movement_level": 0.05,
                "status": "WARNING",
            },
        ],
    },
    "ALT_BP_0031": {
        "alert_id": "ALT_BP_0031",
        "patient_id": "P002",
        "timestamp": "2026-05-28T10:00:00Z",
        "alert_type": "blood_pressure_abnormal",
        "health_status": "ABNORMAL",
        "severity": "MEDIUM",
        "confidence": 0.88,
        "message": "Huyet ap tang cao trong luc benh nhan dang nghi.",
        "evidence": {
            "systolic_bp": 168,
            "diastolic_bp": 102,
            "resting_state": True,
        },
        "sensor_context": [
            {
                "timestamp": "2026-05-28T09:59:00Z",
                "heart_rate": 92,
                "systolic_bp": 154,
                "diastolic_bp": 94,
                "spo2": 96,
                "status": "WARNING",
            },
            {
                "timestamp": "2026-05-28T10:00:00Z",
                "heart_rate": 108,
                "systolic_bp": 168,
                "diastolic_bp": 102,
                "spo2": 95,
                "status": "ABNORMAL",
            },
        ],
    },
}


def get_patient_fixture(patient_id: str) -> dict[str, Any]:
    try:
        return deepcopy(PATIENT_FIXTURES[patient_id])
    except KeyError as exc:
        raise FixtureNotFoundError(f"Unknown patient fixture: {patient_id}") from exc


def get_alert_fixture(alert_id: str) -> dict[str, Any]:
    try:
        return deepcopy(ALERT_FIXTURES[alert_id])
    except KeyError as exc:
        raise FixtureNotFoundError(f"Unknown alert fixture: {alert_id}") from exc
