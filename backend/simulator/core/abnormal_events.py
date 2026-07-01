from __future__ import annotations

import random
from datetime import datetime, timedelta
from statistics import mean
from typing import Any

from simulator.core.config.wearable_reference_config import (
    ABNORM_BP_EFFECTS,
    ABNORM_SPO2_EFFECTS,
    ABNORMALITY_RULES,
)
from simulator.core.models import PatientProfile, format_utc_datetime


EPISODE_SEVERITY: dict[str, str] = {
    "hypertension_episode": "high",
    "tachycardia": "high",
    "spo2_drop": "high",
    "afib_episode": "high",
    "bradycardia": "medium",
    "arrhythmia_episode": "medium",
    "stress_episode": "low",
    "fall_event": "critical",
}


def _profile_by_name(name: str) -> dict[str, Any]:
    for profile in ABNORMALITY_RULES.get("profiles", []):
        if profile.get("name") == name:
            return profile
    known = ", ".join(str(item.get("name")) for item in ABNORMALITY_RULES.get("profiles", []))
    raise ValueError(f"Unknown abnormal event {name!r}. Known events: {known}")


def _sample_effects(rng: random.Random, profile: dict[str, Any]) -> dict[str, float]:
    return {
        key: rng.uniform(float(bounds[0]), float(bounds[1]))
        for key, bounds in profile["effects"].items()
    }


def maybe_start_abnormality_event(
    *,
    rng: random.Random,
    second: int,
    profile: PatientProfile,
    segment: dict[str, Any],
    active_events: list[dict[str, Any]],
) -> None:
    if not ABNORMALITY_RULES.get("enabled"):
        return
    if active_events:
        return
    state = "sleep" if segment["kind"] == "sleep" else segment["state"]
    base_prob = float(ABNORMALITY_RULES["base_probability_per_hour"]) / 3600.0
    boost = sum(
        float(ABNORMALITY_RULES["risk_factor_probability_boost"].get(rf, 0.0))
        for rf in profile.risk_factors
    ) / 3600.0
    multiplier = float(ABNORMALITY_RULES["health_status_multiplier"].get(profile.health_status, 1.0))
    probability = max(0.0, (base_prob + boost) * multiplier)
    if rng.random() >= probability:
        return
    eligible = []
    for candidate in ABNORMALITY_RULES["profiles"]:
        gate = candidate.get("activity_gate")
        if gate is not None and state not in gate:
            continue
        weight = float(candidate["weight"])
        if any(rf in profile.risk_factors for rf in candidate.get("risk_factor_boost", [])):
            weight *= 2.0
        eligible.append({**candidate, "_w": weight})
    if not eligible:
        return
    total = sum(float(candidate["_w"]) for candidate in eligible)
    if total <= 0:
        return
    pick = rng.uniform(0, total)
    cumulative = 0.0
    chosen = eligible[-1]
    for candidate in eligible:
        cumulative += float(candidate["_w"])
        if pick <= cumulative:
            chosen = candidate
            break
    duration_seconds = int(
        rng.uniform(float(chosen["duration_minutes"][0]) * 60, float(chosen["duration_minutes"][1]) * 60)
    )
    active_events.append(build_abnormal_event(chosen["name"], second, duration_seconds, rng=rng))


def build_abnormal_event(
    name: str,
    start_second: int,
    duration_seconds: int | None = None,
    *,
    rng: random.Random | None = None,
) -> dict[str, Any]:
    profile = _profile_by_name(name)
    event_rng = rng or random.Random(f"{name}:{start_second}")
    if duration_seconds is None:
        duration_seconds = int(
            event_rng.uniform(float(profile["duration_minutes"][0]) * 60, float(profile["duration_minutes"][1]) * 60)
        )
    duration_seconds = max(1, int(duration_seconds))
    return {
        "name": name,
        "start_second": int(start_second),
        "end_second": int(start_second) + duration_seconds,
        "effects": _sample_effects(event_rng, profile),
        "motion_spike": profile.get("motion_spike", False),
        "ppi_irregular": profile.get("ppi_irregular", False),
    }


def active_abnormality_effects(
    second: int,
    active_events: list[dict[str, Any]],
) -> tuple[dict[str, float], dict[str, Any] | None]:
    output = {"heart_rate_delta": 0.0, "respiratory_rate_delta": 0.0, "stress_delta": 0.0}
    current_event: dict[str, Any] | None = None
    remaining = []
    for event in active_events:
        if second >= event["end_second"]:
            continue
        duration = max(1, event["end_second"] - event["start_second"])
        progress = (second - event["start_second"]) / duration
        if progress < 0.10:
            envelope = progress / 0.10
        elif progress > 0.90:
            envelope = (1.0 - progress) / 0.10
        else:
            envelope = 1.0
        for name, value in event["effects"].items():
            output[name] += float(value) * envelope
        current_event = event
        remaining.append(event)
    active_events[:] = remaining
    return output, current_event


def build_ppi_intervals_for_window(
    window: list[dict[str, Any]],
    rng: random.Random,
    *,
    window_seconds: int | None = None,
) -> list[int]:
    """Build PPI intervals and make AFib windows irregular enough for Team3."""
    if not window:
        return []

    ppi_mean = mean(float(record["ppi_mean_ms"]) for record in window)
    ppi_std = mean(float(record["ppi_std_ms"]) for record in window)
    hr_avg = mean(float(record["heart_rate"]) for record in window)
    seconds = max(1, int(window_seconds or len(window)))
    n_beats = max(5, int(round(hr_avg * seconds / 60)))

    if any(_is_ppi_irregular_record(record) for record in window):
        intervals = []
        for index in range(n_beats):
            swing = rng.uniform(0.22, 0.34) * ppi_mean
            direction = -1 if index % 2 == 0 else 1
            jitter = rng.gauss(0, max(8.0, ppi_std * 0.35))
            intervals.append(int(round(_clamp_ppi(ppi_mean + direction * swing + jitter))))
        return intervals

    return [
        int(round(_clamp_ppi(rng.gauss(ppi_mean, max(1.0, ppi_std)))))
        for _ in range(n_beats)
    ]


def _is_ppi_irregular_record(record: dict[str, Any]) -> bool:
    return bool(record.get("ppi_irregular")) or record.get("abnormality_event") == "afib_episode"


def _clamp_ppi(value: float) -> float:
    return max(300.0, min(2000.0, float(value)))


def ground_truth_from_event(
    *,
    profile: PatientProfile,
    event: dict[str, Any],
    start_time: datetime,
    status: str = "active",
) -> dict[str, Any]:
    episode_type = str(event["name"])
    start_second = int(event["start_second"])
    end_second = int(event["end_second"])
    duration_sec = max(0, end_second - start_second)
    end_time = start_time + timedelta(seconds=duration_sec)
    bp_fx = ABNORM_BP_EFFECTS.get(episode_type, {})
    spo2_fx = ABNORM_SPO2_EFFECTS.get(episode_type)
    return {
        "patient_id": profile.patient_id,
        "episode_type": episode_type,
        "start_time": format_utc_datetime(start_time),
        "end_time": format_utc_datetime(end_time),
        "duration_seconds": duration_sec,
        "duration_minutes": round(duration_sec / 60, 1),
        "systolic_bp_delta_min": int(bp_fx["systolic"][0]) if bp_fx else None,
        "systolic_bp_delta_max": int(bp_fx["systolic"][1]) if bp_fx else None,
        "diastolic_bp_delta_min": int(bp_fx["diastolic"][0]) if bp_fx else None,
        "diastolic_bp_delta_max": int(bp_fx["diastolic"][1]) if bp_fx else None,
        "spo2_delta_min": float(spo2_fx[0]) if spo2_fx is not None else None,
        "spo2_delta_max": float(spo2_fx[1]) if spo2_fx is not None else None,
        "severity": EPISODE_SEVERITY.get(episode_type),
        "status": status,
    }


def extract_abnormal_episodes(
    profile: PatientProfile,
    sim_records: list[dict[str, Any]],
) -> dict[str, Any]:
    """Scan sim_records and build a log of abnormality episodes with start/end time and peak vitals."""
    episodes: list[dict[str, Any]] = []
    current_name: str | None = None
    episode_start_ts: datetime | None = None
    peak_hr = 0.0
    min_hr = 999.0

    def _close(end_ts: datetime) -> None:
        duration_sec = int((end_ts - episode_start_ts).total_seconds())
        bp_fx = ABNORM_BP_EFFECTS.get(current_name, {})
        spo2_fx = ABNORM_SPO2_EFFECTS.get(current_name)
        episodes.append({
            "episode_type": current_name,
            "start_time": format_utc_datetime(episode_start_ts),
            "end_time": format_utc_datetime(end_ts),
            "duration_seconds": duration_sec,
            "duration_minutes": round(duration_sec / 60, 1),
            "peak_heart_rate": int(round(peak_hr)),
            "min_heart_rate": int(round(min_hr)),
            "systolic_bp_delta_min": int(bp_fx["systolic"][0]) if bp_fx else None,
            "systolic_bp_delta_max": int(bp_fx["systolic"][1]) if bp_fx else None,
            "diastolic_bp_delta_min": int(bp_fx["diastolic"][0]) if bp_fx else None,
            "diastolic_bp_delta_max": int(bp_fx["diastolic"][1]) if bp_fx else None,
            "spo2_delta_min": float(spo2_fx[0]) if spo2_fx is not None else None,
            "spo2_delta_max": float(spo2_fx[1]) if spo2_fx is not None else None,
            "severity": EPISODE_SEVERITY.get(current_name),
            "status": "abnormal",
        })

    for rec in sim_records:
        event_name = rec["abnormality_event"]
        hr = rec["heart_rate"]

        if event_name and event_name != current_name:
            if current_name and episode_start_ts:
                _close(rec["timestamp"])
            current_name = event_name
            episode_start_ts = rec["timestamp"]
            peak_hr = hr
            min_hr = hr
        elif event_name and event_name == current_name:
            peak_hr = max(peak_hr, hr)
            min_hr = min(min_hr, hr)
        elif not event_name and current_name:
            _close(rec["timestamp"])
            current_name = None
            episode_start_ts = None
            peak_hr = 0.0
            min_hr = 999.0

    if current_name and episode_start_ts and sim_records:
        _close(sim_records[-1]["timestamp"])

    return {
        "patient_id": profile.patient_id,
        "risk_factors": profile.risk_factors,
        "health_status": profile.health_status,
        "total_episodes": len(episodes),
        "episodes": episodes,
    }
