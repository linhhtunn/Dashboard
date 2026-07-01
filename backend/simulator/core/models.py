from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any


@dataclass(frozen=True)
class Baseline:
    heart_rate: float
    respiratory_rate: float
    ppi_resting_mean_ms: float
    ppi_resting_std_ms: float
    stress_score: float
    systolic_bp: float
    diastolic_bp: float
    spo2: float
    hrv_rmssd_morning: float


@dataclass(frozen=True)
class WearableBaseline:
    resting_heart_rate: float
    respiratory_rate: float
    ppi_resting_mean_ms: float
    ppi_resting_std_ms: float
    stress_score: float
    spo2: float
    hrv_rmssd_morning: float
    daily_step_tendency: float
    sleep_start_offset_minutes: float
    sleep_duration_tendency_minutes: float
    sleep_fragmentation_tendency: float
    deep_sleep_tendency: float
    rem_sleep_tendency: float
    ppg_noise_level: float
    ppg_amplitude: float
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
    mimic_subject_id: int | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    lab_results: dict[str, Any] | None = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "PatientProfile":
        default_respiratory_rate = {
            "young": 16,
            "middle_aged": 16.5,
            "elderly": 17,
        }.get(data["age_group"], 16)
        baseline_signals = data.get("baseline_signals") or {}
        if baseline_signals:
            if "continuous_1hz" in baseline_signals:
                continuous = baseline_signals.get("continuous_1hz", {})
                summary_60s = baseline_signals.get("summary_60s", {})
                triggered_30min = baseline_signals.get("triggered_30min", {})
                daily = baseline_signals.get("daily", {})
                raw_baseline = {
                    "heart_rate": continuous.get("heart_rate"),
                    "respiratory_rate": continuous.get("respiratory_rate"),
                    "ppi_resting_mean_ms": continuous.get("ppi_resting_mean_ms"),
                    "ppi_resting_std_ms": continuous.get("ppi_resting_std_ms"),
                    "stress_score": summary_60s.get("stress_score"),
                    "systolic_bp": triggered_30min.get("systolic_bp"),
                    "diastolic_bp": triggered_30min.get("diastolic_bp"),
                    "spo2": triggered_30min.get("spo2"),
                    "hrv_rmssd_morning": daily.get("hrv_rmssd_morning"),
                    "ecg_rhythm": daily.get("ecg_rhythm", "sinus_rhythm"),
                }
            else:
                raw_baseline = dict(baseline_signals)
            grouped_wearable_baseline = {
                "resting_heart_rate": raw_baseline.get("heart_rate"),
                "respiratory_rate": raw_baseline.get("respiratory_rate"),
                "ppi_resting_mean_ms": raw_baseline.get("ppi_resting_mean_ms"),
                "ppi_resting_std_ms": raw_baseline.get("ppi_resting_std_ms"),
                "stress_score": raw_baseline.get("stress_score"),
                "spo2": raw_baseline.get("spo2"),
                "hrv_rmssd_morning": raw_baseline.get("hrv_rmssd_morning"),
                "daily_step_tendency": 1.0,
                "sleep_start_offset_minutes": 0,
                "sleep_duration_tendency_minutes": 450,
                "sleep_fragmentation_tendency": 0.20,
                "deep_sleep_tendency": 0.20,
                "rem_sleep_tendency": 0.22,
                "ppg_noise_level": 0.008,
                "ppg_amplitude": 1.0,
                "ecg_rhythm": raw_baseline.get("ecg_rhythm", "sinus_rhythm"),
            }
        else:
            raw_baseline = dict(data["baseline"])
            grouped_wearable_baseline = None
        if "ppi_resting_mean_ms" not in raw_baseline:
            heart_rate = float(raw_baseline["heart_rate"])
            raw_baseline["ppi_resting_mean_ms"] = 60_000 / max(heart_rate, 1)
        if "ppi_resting_std_ms" not in raw_baseline:
            raw_baseline["ppi_resting_std_ms"] = raw_baseline.get("hrv_rmssd", 15)
        if "respiratory_rate" not in raw_baseline:
            raw_baseline["respiratory_rate"] = default_respiratory_rate
        if "stress_score" not in raw_baseline:
            raw_baseline["stress_score"] = 34
        if "hrv_rmssd_morning" not in raw_baseline:
            raw_baseline["hrv_rmssd_morning"] = raw_baseline.get("hrv_rmssd", raw_baseline["ppi_resting_std_ms"])
        raw_baseline.pop("rr_interval_ms", None)
        raw_baseline.pop("hrv_rmssd", None)
        raw_baseline.pop("ecg_rhythm", None)
        baseline = Baseline(**raw_baseline)

        wearable_baseline_data = data.get("wearable_baseline") or grouped_wearable_baseline or {
            "resting_heart_rate": baseline.heart_rate,
            "respiratory_rate": baseline.respiratory_rate,
            "ppi_resting_mean_ms": baseline.ppi_resting_mean_ms,
            "ppi_resting_std_ms": baseline.ppi_resting_std_ms,
            "stress_score": baseline.stress_score,
            "spo2": baseline.spo2,
            "hrv_rmssd_morning": baseline.hrv_rmssd_morning,
            "daily_step_tendency": 1.0,
            "sleep_start_offset_minutes": 0,
            "sleep_duration_tendency_minutes": 450,
            "sleep_fragmentation_tendency": 0.20,
            "deep_sleep_tendency": 0.20,
            "rem_sleep_tendency": 0.22,
            "ppg_noise_level": 0.008,
            "ppg_amplitude": 1.0,
            "ecg_rhythm": "sinus_rhythm",
        }
        if "ppi_resting_mean_ms" not in wearable_baseline_data:
            wearable_baseline_data["ppi_resting_mean_ms"] = baseline.ppi_resting_mean_ms
        if "ppi_resting_std_ms" not in wearable_baseline_data:
            wearable_baseline_data["ppi_resting_std_ms"] = baseline.ppi_resting_std_ms
        if "respiratory_rate" not in wearable_baseline_data:
            wearable_baseline_data["respiratory_rate"] = baseline.respiratory_rate
        if "ppg_noise_level" not in wearable_baseline_data and "ecg_noise_level" in wearable_baseline_data:
            wearable_baseline_data["ppg_noise_level"] = wearable_baseline_data.pop("ecg_noise_level")
        if "ppg_amplitude" not in wearable_baseline_data and "ecg_amplitude" in wearable_baseline_data:
            wearable_baseline_data["ppg_amplitude"] = wearable_baseline_data.pop("ecg_amplitude")
        if "ppg_noise_level" not in wearable_baseline_data:
            wearable_baseline_data["ppg_noise_level"] = 0.008
        if "ppg_amplitude" not in wearable_baseline_data:
            wearable_baseline_data["ppg_amplitude"] = 1.0
        wearable_baseline_data = {
            "resting_heart_rate": wearable_baseline_data.get("resting_heart_rate", baseline.heart_rate),
            "respiratory_rate": wearable_baseline_data["respiratory_rate"],
            "ppi_resting_mean_ms": wearable_baseline_data["ppi_resting_mean_ms"],
            "ppi_resting_std_ms": wearable_baseline_data["ppi_resting_std_ms"],
            "stress_score": wearable_baseline_data.get("stress_score", baseline.stress_score),
            "spo2": wearable_baseline_data.get("spo2", baseline.spo2),
            "hrv_rmssd_morning": wearable_baseline_data.get("hrv_rmssd_morning", baseline.hrv_rmssd_morning),
            "daily_step_tendency": wearable_baseline_data["daily_step_tendency"],
            "sleep_start_offset_minutes": wearable_baseline_data["sleep_start_offset_minutes"],
            "sleep_duration_tendency_minutes": wearable_baseline_data["sleep_duration_tendency_minutes"],
            "sleep_fragmentation_tendency": wearable_baseline_data["sleep_fragmentation_tendency"],
            "deep_sleep_tendency": wearable_baseline_data["deep_sleep_tendency"],
            "rem_sleep_tendency": wearable_baseline_data["rem_sleep_tendency"],
            "ppg_noise_level": wearable_baseline_data["ppg_noise_level"],
            "ppg_amplitude": wearable_baseline_data["ppg_amplitude"],
            "ecg_rhythm": wearable_baseline_data.get("ecg_rhythm", "sinus_rhythm"),
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
            baseline=baseline,
            wearable_baseline=WearableBaseline(**wearable_baseline_data),
            mimic_subject_id=data.get("mimic_subject_id"),
            height_cm=data.get("height_cm"),
            weight_kg=data.get("weight_kg"),
            lab_results=data.get("lab_results"),
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
