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
class PatientProfile:
    patient_id: str
    name: str
    age: int
    gender: str
    age_group: str
    risk_group: list[str]
    activity_level: str
    medical_history: str
    health_status: str
    baseline: Baseline

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "PatientProfile":
        return cls(
            patient_id=data["patient_id"],
            name=data["name"],
            age=int(data["age"]),
            gender=data["gender"],
            age_group=data["age_group"],
            risk_group=list(data.get("risk_group", [])),
            activity_level=data["activity_level"],
            medical_history=data.get("medical_history", ""),
            health_status=data.get("health_status", "NORMAL"),
            baseline=Baseline(**data["baseline"]),
        )


@dataclass(frozen=True)
class ActivitySegment:
    scenario_id: str
    patient_id: str
    activity_state: str
    activity_intensity: str
    start_second: int
    end_second: int
    event_type: str
    ground_truth_label: str = "NORMAL"
    expected_severity: str = "LOW"
    context_event: str | None = None
    context_effects: dict[str, float] | None = None
    source: str = "configured"

    def contains(self, second: int) -> bool:
        return self.start_second <= second < self.end_second


def parse_utc_datetime(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def format_utc_datetime(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
