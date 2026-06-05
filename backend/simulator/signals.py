from __future__ import annotations

import math
import random
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Iterator

from backend.simulator.models import ActivitySegment, PatientProfile, format_utc_datetime
from backend.simulator.rules import INTENSITY_MULTIPLIER, get_activity_rule
from backend.simulator.signal_expectations import expected_signal_centers, personalized_signal_range
from backend.simulator.timeline import find_segment


@dataclass
class SignalState:
    heart_rate: float
    hrv_rmssd: float
    systolic_bp: float
    diastolic_bp: float
    spo2: float


@dataclass
class LatentSignalState:
    autonomic: float = 0.0
    vascular: float = 0.0
    oxygen: float = 0.0


@dataclass
class BehaviorNoisePulse:
    remaining_seconds: int
    effects: dict[str, float]


def _smooth(previous: float, target: float, alpha: float, noise: float) -> float:
    return previous + alpha * (target - previous) + noise


def _round(value: float, digits: int = 2) -> float:
    return round(value, digits)


def _rr_interval_ms(heart_rate: float) -> int:
    if heart_rate <= 0:
        return 0
    return int(round(60000 / heart_rate))


def _ou_step(previous: float, rng: random.Random, theta: float, sigma: float, dt: int) -> float:
    reversion = min(1.0, theta * max(dt, 1))
    return previous + reversion * (0.0 - previous) + rng.gauss(0, sigma * math.sqrt(max(dt, 1)))


def _advance_latent_state(latent: LatentSignalState, rng: random.Random, sampling_interval_seconds: int) -> LatentSignalState:
    return LatentSignalState(
        autonomic=_ou_step(latent.autonomic, rng, theta=0.018, sigma=0.18, dt=sampling_interval_seconds),
        vascular=_ou_step(latent.vascular, rng, theta=0.006, sigma=0.06, dt=sampling_interval_seconds),
        oxygen=_ou_step(latent.oxygen, rng, theta=0.020, sigma=0.018, dt=sampling_interval_seconds),
    )


def _target_state(
    profile: PatientProfile,
    segment: ActivitySegment,
    rng: random.Random,
    latent: LatentSignalState,
    behavior_effects: dict[str, float] | None = None,
) -> SignalState:
    rule = get_activity_rule(segment.activity_state)
    context_effects = _combined_effects(segment, behavior_effects)
    centers = expected_signal_centers(profile, rule, segment.activity_intensity)
    baseline_hr_delta = centers["heart_rate"] - profile.baseline.heart_rate
    context_hr_delta = context_effects.get("heart_rate_delta", 0.0)
    shared_hr_pressure = max(0.0, baseline_hr_delta + context_hr_delta + latent.autonomic)

    heart_rate = (
        centers["heart_rate"]
        + context_hr_delta
        + latent.autonomic
        + rng.gauss(0, max(rule.hr_delta_std * 0.25, 0.55))
    )
    hrv_rmssd = (
        centers["hrv_rmssd"]
        + context_effects.get("hrv_rmssd_delta", 0.0)
        - shared_hr_pressure * 0.24
        + min(0.0, latent.autonomic) * 0.08
        + rng.gauss(0, 0.9)
    )
    systolic_bp = (
        centers["systolic_bp"]
        + context_effects.get("systolic_bp_delta", 0.0)
        + latent.vascular
        + shared_hr_pressure * 0.10
        + rng.gauss(0, 0.75)
    )
    diastolic_bp = (
        centers["diastolic_bp"]
        + context_effects.get("diastolic_bp_delta", 0.0)
        + latent.vascular * 0.45
        + shared_hr_pressure * 0.035
        + rng.gauss(0, 0.45)
    )
    spo2 = (
        centers["spo2"]
        + context_effects.get("spo2_delta", 0.0)
        + latent.oxygen
        - max(0.0, baseline_hr_delta) * 0.003
        + rng.gauss(0, 0.035)
    )

    return SignalState(
        heart_rate=personalized_signal_range(profile, rule, segment.activity_intensity, "heart_rate").clamp(heart_rate),
        hrv_rmssd=personalized_signal_range(profile, rule, segment.activity_intensity, "hrv_rmssd").clamp(hrv_rmssd),
        systolic_bp=personalized_signal_range(profile, rule, segment.activity_intensity, "systolic_bp").clamp(systolic_bp),
        diastolic_bp=personalized_signal_range(profile, rule, segment.activity_intensity, "diastolic_bp").clamp(diastolic_bp),
        spo2=personalized_signal_range(profile, rule, segment.activity_intensity, "spo2").clamp(spo2),
    )


def _combined_effects(segment: ActivitySegment, behavior_effects: dict[str, float] | None = None) -> dict[str, float]:
    effects = dict(segment.context_effects or {})
    for key, value in (behavior_effects or {}).items():
        if key == "motion_frequency_multiplier":
            effects[key] = effects.get(key, 1.0) * value
        else:
            effects[key] = effects.get(key, 0.0) + value
    return effects


def _uniform_range(rng: random.Random, bounds: list[float] | tuple[float, float] | None, default: float = 0.0) -> float:
    if not bounds:
        return default
    return rng.uniform(float(bounds[0]), float(bounds[1]))


def _sample_behavior_noise_pulse(
    segment: ActivitySegment,
    behavior_rng: random.Random,
    behavior_noise_config: dict | None,
    sampling_interval_seconds: int,
) -> BehaviorNoisePulse | None:
    config = behavior_noise_config or {}
    if not config.get("enabled", False):
        return None

    probability_per_minute = float(config.get("probability_per_minute", 0.0))
    activity_multiplier = float(config.get("activity_multipliers", {}).get(segment.activity_state, 1.0))
    probability_per_sample = probability_per_minute * activity_multiplier * sampling_interval_seconds / 60
    if behavior_rng.random() >= probability_per_sample:
        return None

    profile_config = _sample_behavior_noise_profile(behavior_rng, config)
    duration_range = profile_config.get("duration_seconds", config.get("duration_seconds", [20, 90]))
    duration = behavior_rng.randint(int(duration_range[0]), int(duration_range[1]))
    effect_ranges = profile_config.get("effect_ranges", config.get("effect_ranges", {}))
    effects = {
        "heart_rate_delta": _uniform_range(behavior_rng, effect_ranges.get("heart_rate_delta")),
        "hrv_rmssd_delta": _uniform_range(behavior_rng, effect_ranges.get("hrv_rmssd_delta")),
        "systolic_bp_delta": _uniform_range(behavior_rng, effect_ranges.get("systolic_bp_delta")),
        "diastolic_bp_delta": _uniform_range(behavior_rng, effect_ranges.get("diastolic_bp_delta")),
        "spo2_delta": _uniform_range(behavior_rng, effect_ranges.get("spo2_delta")),
        "acc_amplitude_delta": _uniform_range(behavior_rng, effect_ranges.get("acc_amplitude_delta")),
        "gyro_amplitude_delta": _uniform_range(behavior_rng, effect_ranges.get("gyro_amplitude_delta")),
        "motion_frequency_multiplier": _uniform_range(
            behavior_rng,
            effect_ranges.get("motion_frequency_multiplier"),
            default=1.0,
        ),
    }
    return BehaviorNoisePulse(remaining_seconds=duration, effects=effects)


def _sample_behavior_noise_profile(behavior_rng: random.Random, config: dict) -> dict:
    profiles = config.get("profiles")
    if not profiles:
        return config

    total = sum(max(float(profile.get("weight", 0.0)), 0.0) for profile in profiles)
    if total <= 0:
        return profiles[0]

    pick = behavior_rng.uniform(0, total)
    cumulative = 0.0
    for profile in profiles:
        cumulative += max(float(profile.get("weight", 0.0)), 0.0)
        if pick <= cumulative:
            return profile
    return profiles[-1]


def _advance_behavior_noise_pulse(
    pulse: BehaviorNoisePulse | None,
    segment: ActivitySegment,
    behavior_rng: random.Random,
    behavior_noise_config: dict | None,
    sampling_interval_seconds: int,
) -> tuple[BehaviorNoisePulse | None, dict[str, float]]:
    if pulse is None or pulse.remaining_seconds <= 0:
        pulse = _sample_behavior_noise_pulse(segment, behavior_rng, behavior_noise_config, sampling_interval_seconds)

    if pulse is None:
        return None, {}

    pulse.remaining_seconds -= sampling_interval_seconds
    return pulse, pulse.effects


def _imu_values(
    segment: ActivitySegment,
    second: int,
    rng: random.Random,
    behavior_effects: dict[str, float] | None = None,
) -> dict[str, float]:
    rule = get_activity_rule(segment.activity_state)
    multiplier = INTENSITY_MULTIPLIER.get(segment.activity_intensity, 1.0)
    context_effects = _combined_effects(segment, behavior_effects)
    frequency_multiplier = context_effects.get("motion_frequency_multiplier", 1.0)
    phase = 2 * math.pi * rule.motion_frequency_hz * frequency_multiplier * second

    acc_amp = rule.acc_amplitude * multiplier + context_effects.get("acc_amplitude_delta", 0)
    gyro_amp = rule.gyro_amplitude * multiplier + context_effects.get("gyro_amplitude_delta", 0)

    acc_x = acc_amp * math.sin(phase) + rng.gauss(0, 0.025)
    acc_y = acc_amp * 0.65 * math.sin(phase + math.pi / 3) + rng.gauss(0, 0.025)
    acc_z = 1.0 + acc_amp * 0.35 * math.sin(phase + math.pi / 6) + rng.gauss(0, 0.018)

    gyro_x = gyro_amp * math.sin(phase + math.pi / 5) + rng.gauss(0, 0.015)
    gyro_y = gyro_amp * 0.75 * math.sin(phase + math.pi / 2) + rng.gauss(0, 0.015)
    gyro_z = gyro_amp * 0.35 * math.sin(phase + math.pi / 8) + rng.gauss(0, 0.010)

    acc_magnitude = math.sqrt(acc_x**2 + acc_y**2 + acc_z**2)
    gyro_magnitude = math.sqrt(gyro_x**2 + gyro_y**2 + gyro_z**2)

    return {
        "acc_x": _round(acc_x),
        "acc_y": _round(acc_y),
        "acc_z": _round(acc_z),
        "acc_magnitude": _round(rule.acc_magnitude.clamp(acc_magnitude)),
        "gyro_x": _round(gyro_x),
        "gyro_y": _round(gyro_y),
        "gyro_z": _round(gyro_z),
        "gyro_magnitude": _round(rule.gyro_magnitude.clamp(gyro_magnitude)),
    }


def generate_vitals_messages(
    profile: PatientProfile,
    segments: list[ActivitySegment],
    start_time: datetime,
    seed: int = 42,
    sampling_interval_seconds: int = 1,
    behavior_noise_config: dict | None = None,
) -> Iterator[dict]:
    if sampling_interval_seconds < 1:
        raise ValueError("sampling_interval_seconds must be >= 1")

    rng = random.Random(seed)
    behavior_rng = random.Random((behavior_noise_config or {}).get("seed", seed + 2))
    total_seconds = max(segment.end_second for segment in segments)
    current = SignalState(
        heart_rate=profile.baseline.heart_rate,
        hrv_rmssd=profile.baseline.hrv_rmssd,
        systolic_bp=profile.baseline.systolic_bp,
        diastolic_bp=profile.baseline.diastolic_bp,
        spo2=profile.baseline.spo2,
    )
    behavior_pulse: BehaviorNoisePulse | None = None
    latent = LatentSignalState()

    for message_index, second in enumerate(range(0, total_seconds, sampling_interval_seconds), start=1):
        segment = find_segment(segments, second)
        rule = get_activity_rule(segment.activity_state)
        latent = _advance_latent_state(latent, rng, sampling_interval_seconds)
        behavior_pulse, behavior_effects = _advance_behavior_noise_pulse(
            behavior_pulse,
            segment,
            behavior_rng,
            behavior_noise_config,
            sampling_interval_seconds,
        )
        target = _target_state(profile, segment, rng, latent, behavior_effects)
        heart_rate_range = personalized_signal_range(profile, rule, segment.activity_intensity, "heart_rate")
        hrv_range = personalized_signal_range(profile, rule, segment.activity_intensity, "hrv_rmssd")
        systolic_range = personalized_signal_range(profile, rule, segment.activity_intensity, "systolic_bp")
        diastolic_range = personalized_signal_range(profile, rule, segment.activity_intensity, "diastolic_bp")
        spo2_range = personalized_signal_range(profile, rule, segment.activity_intensity, "spo2")

        current = SignalState(
            heart_rate=heart_rate_range.clamp(
                _smooth(current.heart_rate, target.heart_rate, alpha=0.075, noise=rng.gauss(0, 0.45))
            ),
            hrv_rmssd=hrv_range.clamp(
                _smooth(current.hrv_rmssd, target.hrv_rmssd, alpha=0.06, noise=rng.gauss(0, 0.65))
            ),
            systolic_bp=systolic_range.clamp(
                _smooth(current.systolic_bp, target.systolic_bp, alpha=0.025, noise=rng.gauss(0, 0.35))
            ),
            diastolic_bp=diastolic_range.clamp(
                _smooth(current.diastolic_bp, target.diastolic_bp, alpha=0.025, noise=rng.gauss(0, 0.22))
            ),
            spo2=spo2_range.clamp(
                _smooth(current.spo2, target.spo2, alpha=0.035, noise=rng.gauss(0, 0.04))
            ),
        )

        timestamp = start_time + timedelta(seconds=second)
        signals = {
            "heart_rate": int(round(current.heart_rate)),
            "rr_interval_ms": _rr_interval_ms(current.heart_rate),
            "hrv_rmssd": int(round(current.hrv_rmssd)),
            "systolic_bp": int(round(current.systolic_bp)),
            "diastolic_bp": int(round(current.diastolic_bp)),
            "spo2": int(round(current.spo2)),
        }
        signals.update(_imu_values(segment, second, rng, behavior_effects))

        yield {
            "message_id": f"msg_{profile.patient_id}_{message_index:06d}",
            "schema_version": "v1",
            "patient_id": profile.patient_id,
            "device_id": f"SIM_WATCH_{profile.patient_id}",
            "timestamp": format_utc_datetime(timestamp),
            "signals": signals,
        }
