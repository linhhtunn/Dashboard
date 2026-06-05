from __future__ import annotations

import math
import random
from collections import deque
from datetime import datetime, time, timedelta
from typing import Any, Iterator

from simulator.config.wearable_reference_config import (
    ACTIVITY_EFFECTS,
    SIGNAL_NOISE_RULES,
    SLEEP_GENERATION_RULES,
    SLEEP_STAGE_EFFECTS,
)
from simulator.models import PatientProfile, format_utc_datetime
from simulator.wearable_timeline import find_master_segment


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _smooth(previous: float, target: float, alpha: float, noise: float) -> float:
    return previous + alpha * (target - previous) + noise


def _mean(values: deque[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _weighted_choice(rng: random.Random, items: list[dict[str, Any]]) -> dict[str, Any]:
    total = sum(max(float(item["weight"]), 0.0) for item in items)
    if total <= 0:
        return items[0]
    pick = rng.uniform(0, total)
    cumulative = 0.0
    for item in items:
        cumulative += max(float(item["weight"]), 0.0)
        if pick <= cumulative:
            return item
    return items[-1]


def _sample_noise_effects(rng: random.Random, effect_ranges: dict[str, list[float]]) -> dict[str, float]:
    return {
        name: rng.uniform(float(bounds[0]), float(bounds[1]))
        for name, bounds in effect_ranges.items()
    }


def _maybe_start_noise_event(
    *,
    rng: random.Random,
    second: int,
    segment: dict[str, Any],
    active_events: list[dict[str, Any]],
) -> None:
    if not SIGNAL_NOISE_RULES["enabled"]:
        return
    if len(active_events) >= int(SIGNAL_NOISE_RULES["max_active_events"]):
        return

    state = "sleep" if segment["kind"] == "sleep" else segment["state"]
    multiplier = float(SIGNAL_NOISE_RULES["activity_multipliers"].get(state, 1.0))
    probability = float(SIGNAL_NOISE_RULES["probability_per_minute"]) * multiplier / 60.0
    if rng.random() >= probability:
        return

    profile = _weighted_choice(rng, SIGNAL_NOISE_RULES["profiles"])
    duration_bounds = profile["duration_seconds"]
    duration_seconds = rng.randint(int(duration_bounds[0]), int(duration_bounds[1]))
    active_events.append(
        {
            "start_second": second,
            "end_second": second + duration_seconds,
            "effects": _sample_noise_effects(rng, profile["effect_ranges"]),
        }
    )


def _active_noise_effects(second: int, active_events: list[dict[str, Any]]) -> dict[str, float]:
    output = {
        "heart_rate_delta": 0.0,
        "respiratory_rate_delta": 0.0,
        "stress_delta": 0.0,
    }
    remaining_events = []
    for event in active_events:
        if second >= event["end_second"]:
            continue
        duration = max(1, event["end_second"] - event["start_second"])
        progress = (second - event["start_second"]) / duration
        envelope = math.sin(math.pi * max(0.0, min(1.0, progress)))
        for name, value in event["effects"].items():
            output[name] += float(value) * envelope
        remaining_events.append(event)
    active_events[:] = remaining_events
    return output


def _parse_hhmm(value: str) -> time:
    hour, minute = value.split(":", maxsplit=1)
    return time(hour=int(hour), minute=int(minute))


def _scheduled_datetimes(start_time: datetime, end_time: datetime, hhmm_values: list[str]) -> list[datetime]:
    output = []
    current_day = start_time.date()
    while current_day <= end_time.date():
        for value in hhmm_values:
            candidate = datetime.combine(current_day, _parse_hhmm(value), tzinfo=start_time.tzinfo)
            if start_time <= candidate < end_time:
                output.append(candidate)
        current_day += timedelta(days=1)
    return sorted(output)


def _effects_for_segment(segment: dict[str, Any]) -> dict[str, Any]:
    if segment["kind"] == "sleep":
        return SLEEP_STAGE_EFFECTS[segment["state"]]
    return ACTIVITY_EFFECTS[segment["state"]]


def generate_continuous_records(
    *,
    profile: PatientProfile,
    master_timeline: list[dict[str, Any]],
    start_time: datetime,
    duration_seconds: int,
    wearable_config: dict[str, Any],
    seed: int,
) -> Iterator[dict[str, Any]]:
    rng = random.Random(seed)
    interval_seconds = int(wearable_config["continuous_interval_seconds"])
    windows = wearable_config["windows"]
    hr_window = deque(maxlen=int(windows["heart_rate_seconds"]))
    rr_window = deque(maxlen=int(windows["respiratory_rate_seconds"]))

    wearable_baseline = profile.wearable_baseline
    base_hr = float(wearable_baseline.resting_heart_rate)
    base_rr = float(wearable_baseline.respiratory_rate)
    base_stress = float(wearable_baseline.stress_score)

    current_hr = base_hr
    current_rr = base_rr
    current_stress = base_stress
    cumulative_steps = 0
    step_accumulator = 0.0
    current_date = start_time.date()
    message_index = 0
    active_noise_events: list[dict[str, Any]] = []

    for second in range(duration_seconds):
        timestamp = start_time + timedelta(seconds=second)
        if timestamp.date() != current_date:
            current_date = timestamp.date()
            cumulative_steps = 0
            step_accumulator = 0.0

        segment = find_master_segment(master_timeline, timestamp)
        effects = _effects_for_segment(segment)
        hr_delta = float(effects["heart_rate_delta"])
        rr_delta = float(effects["respiratory_rate_delta"])
        stress_delta = float(effects["stress_delta"])
        _maybe_start_noise_event(
            rng=rng,
            second=second,
            segment=segment,
            active_events=active_noise_events,
        )
        noise_effects = _active_noise_effects(second, active_noise_events)

        target_hr = base_hr + hr_delta + noise_effects["heart_rate_delta"]
        target_rr = base_rr + rr_delta + noise_effects["respiratory_rate_delta"] + max(0.0, target_hr - base_hr) * 0.035
        target_stress = base_stress + stress_delta + noise_effects["stress_delta"] + max(0.0, current_hr - base_hr) * 0.10

        current_hr = _clamp(_smooth(current_hr, target_hr, 0.08, rng.gauss(0, 0.35)), 35, 190)
        current_rr = _clamp(_smooth(current_rr, target_rr, 0.05, rng.gauss(0, 0.08)), 8, 35)
        current_stress = _clamp(_smooth(current_stress, target_stress, 0.04, rng.gauss(0, 0.35)), 0, 99)

        step_bounds = effects["steps_per_minute"]
        step_tendency = float(wearable_baseline.daily_step_tendency)
        step_accumulator += rng.uniform(float(step_bounds[0]), float(step_bounds[1])) * step_tendency / 60.0
        while step_accumulator >= 1.0:
            cumulative_steps += 1
            step_accumulator -= 1.0

        hr_window.append(current_hr)
        rr_window.append(current_rr)

        if second % interval_seconds != 0:
            continue

        message_index += 1
        yield {
            "message_id": f"msg_{profile.patient_id}_cont_{message_index:06d}",
            "patient_id": profile.patient_id,
            "device_id": f"SIM_WATCH_{profile.patient_id}",
            "timestamp": format_utc_datetime(timestamp),
            "steps": int(cumulative_steps),
            "heart_rate": int(round(_mean(hr_window))),
            "respiratory_rate": int(round(_mean(rr_window))),
            "stress_score": int(round(current_stress)),
        }


def generate_spo2_records(
    *,
    profile: PatientProfile,
    start_time: datetime,
    duration_seconds: int,
    wearable_config: dict[str, Any],
    seed: int,
) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    end_time = start_time + timedelta(seconds=duration_seconds)
    trigger_times = _scheduled_datetimes(start_time, end_time, wearable_config["trigger_schedule"].get("spo2", []))
    records = []
    for index, timestamp in enumerate(trigger_times, start=1):
        spo2 = int(round(_clamp(profile.wearable_baseline.spo2 + rng.gauss(0, 0.35), 92, 100)))
        records.append(
            {
                "message_id": f"msg_{profile.patient_id}_spo2_{index:06d}",
                "patient_id": profile.patient_id,
                "device_id": f"SIM_WATCH_{profile.patient_id}",
                "timestamp": format_utc_datetime(timestamp),
                "spo2": spo2,
            }
        )
    return records


def _ecg_value(
    t_seconds: float,
    heart_period_seconds: float,
    rng: random.Random,
    *,
    amplitude: float,
    noise_level: float,
) -> float:
    phase = t_seconds % heart_period_seconds

    def wave(center: float, width: float, amplitude: float) -> float:
        return amplitude * math.exp(-((phase - center) ** 2) / (2 * width**2))

    p_wave = wave(0.18 * heart_period_seconds, 0.035, 0.08 * amplitude)
    q_wave = wave(0.36 * heart_period_seconds, 0.012, -0.10 * amplitude)
    r_wave = wave(0.40 * heart_period_seconds, 0.010, 1.00 * amplitude)
    s_wave = wave(0.43 * heart_period_seconds, 0.014, -0.22 * amplitude)
    t_wave = wave(0.65 * heart_period_seconds, 0.060, 0.24 * amplitude)
    baseline_wander = 0.025 * math.sin(2 * math.pi * 0.33 * t_seconds)
    return p_wave + q_wave + r_wave + s_wave + t_wave + baseline_wander + rng.gauss(0, noise_level)


def _ecg_points(
    duration_seconds: int,
    sampling_rate_hz: int,
    heart_rate: float,
    seed: int,
    *,
    amplitude: float,
    noise_level: float,
) -> list[dict[str, float]]:
    rng = random.Random(seed)
    sample_count = duration_seconds * sampling_rate_hz
    heart_period_seconds = 60.0 / max(heart_rate, 1.0)
    points = []
    for sample_index in range(sample_count):
        t_seconds = sample_index / sampling_rate_hz
        points.append(
            {
                "t_ms": int(round(t_seconds * 1000)),
                "value": round(
                    _ecg_value(
                        t_seconds,
                        heart_period_seconds,
                        rng,
                        amplitude=amplitude,
                        noise_level=noise_level,
                    ),
                    3,
                ),
            }
        )
    return points


def generate_ecg_records(
    *,
    profile: PatientProfile,
    start_time: datetime,
    duration_seconds: int,
    wearable_config: dict[str, Any],
    seed: int,
) -> list[dict[str, Any]]:
    end_time = start_time + timedelta(seconds=duration_seconds)
    trigger_times = _scheduled_datetimes(start_time, end_time, wearable_config["trigger_schedule"].get("ecg", []))
    ecg_config = wearable_config["ecg"]
    records = []
    for index, timestamp in enumerate(trigger_times, start=1):
        records.append(
            {
                "message_id": f"msg_{profile.patient_id}_ecg_{index:06d}",
                "patient_id": profile.patient_id,
                "device_id": f"SIM_WATCH_{profile.patient_id}",
                "timestamp": format_utc_datetime(timestamp),
                "ecg_result": "normal",
                "ecg_rhythm": profile.wearable_baseline.ecg_rhythm,
                "ecg_abnormal_flags": [],
                "ecg_lead": ecg_config["lead"],
                "ecg_unit": ecg_config["unit"],
                "ecg_sampling_rate_hz": int(ecg_config["sampling_rate_hz"]),
                "ecg_duration_seconds": int(ecg_config["duration_seconds"]),
                "ecg_points": _ecg_points(
                    int(ecg_config["duration_seconds"]),
                    int(ecg_config["sampling_rate_hz"]),
                    profile.wearable_baseline.resting_heart_rate,
                    seed + index,
                    amplitude=profile.wearable_baseline.ecg_amplitude,
                    noise_level=profile.wearable_baseline.ecg_noise_level,
                ),
            }
        )
    return records


def generate_daily_metrics(
    *,
    profile: PatientProfile,
    sleep_sessions: list[dict[str, Any]],
    start_time: datetime,
    duration_seconds: int,
    seed: int,
) -> object:
    rng = random.Random(seed)
    end_time = start_time + timedelta(seconds=duration_seconds)
    delay_minutes = int(SLEEP_GENERATION_RULES["morning_hrv_delay_minutes"])
    records = []
    for session in sleep_sessions:
        measured_at = session["sleep_end"] + timedelta(minutes=delay_minutes)
        if not start_time <= measured_at < end_time:
            continue
        hrv = int(round(_clamp(profile.wearable_baseline.hrv_rmssd_morning + rng.gauss(0, 4), 10, 120)))
        records.append(
            {
                "patient_id": profile.patient_id,
                "date": measured_at.date().isoformat(),
                "measured_at": format_utc_datetime(measured_at),
                "hrv_rmssd_morning": hrv,
            }
        )
    return records[0] if len(records) == 1 else records

