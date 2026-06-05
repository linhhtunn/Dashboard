from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any


@dataclass(frozen=True)
class Baseline:
    heart_rate: float
    rr_interval_ms: float
    hrv_rmssd: float
    systolic_bp: float
    diastolic_bp: float
    spo2: float


@dataclass(frozen=True)
class WearableBaseline:
    resting_heart_rate: float
    respiratory_rate: float
    stress_score: float
    spo2: float
    hrv_rmssd_morning: float
    daily_step_tendency: float
    sleep_start_offset_minutes: float
    sleep_duration_tendency_minutes: float
    sleep_fragmentation_tendency: float
    deep_sleep_tendency: float
    rem_sleep_tendency: float
    ecg_noise_level: float
    ecg_amplitude: float
    ecg_rhythm: str = "sinus_rhythm"


@dataclass(frozen=True)
class PatientProfile:
    patient_id: str
    name: str
    age: int
    gender: str
    age_group: str
    pregnancy_status: str
    lifestyle: str
    risk_factors: list[str]
    activity_level: str
    medical_history: str
    health_status: str
    baseline: Baseline
    wearable_baseline: WearableBaseline

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "PatientProfile":
        legacy_baseline = Baseline(**data["baseline"])
        wearable_baseline_data = data.get("wearable_baseline") or {
            "resting_heart_rate": legacy_baseline.heart_rate,
            "respiratory_rate": 16 if data["age_group"] == "young" else 17,
            "stress_score": 34,
            "spo2": legacy_baseline.spo2,
            "hrv_rmssd_morning": legacy_baseline.hrv_rmssd,
            "daily_step_tendency": 1.0,
            "sleep_start_offset_minutes": 0,
            "sleep_duration_tendency_minutes": 450,
            "sleep_fragmentation_tendency": 0.20,
            "deep_sleep_tendency": 0.20,
            "rem_sleep_tendency": 0.22,
            "ecg_noise_level": 0.008,
            "ecg_amplitude": 1.0,
            "ecg_rhythm": "sinus_rhythm",
        }
        return cls(
            patient_id=data["patient_id"],
            name=data["name"],
            age=int(data["age"]),
            gender=data["gender"],
            age_group=data["age_group"],
            pregnancy_status=data.get("pregnancy_status", "none"),
            lifestyle=data.get("lifestyle", ""),
            risk_factors=list(data.get("risk_factors", data.get("risk_group", []))),
            activity_level=data["activity_level"],
            medical_history=data.get("medical_history", ""),
            health_status=data.get("health_status", "NORMAL"),
            baseline=legacy_baseline,
            wearable_baseline=WearableBaseline(**wearable_baseline_data),
        )

    @property
    def risk_group(self) -> list[str]:
        return self.risk_factors


def parse_utc_datetime(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def format_utc_datetime(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

