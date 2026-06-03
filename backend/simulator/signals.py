from __future__ import annotations

import math
import random
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Iterator

from backend.simulator.models import ActivitySegment, PatientProfile, format_utc_datetime
from backend.simulator.rules import INTENSITY_MULTIPLIER, get_activity_rule
from backend.simulator.timeline import find_segment


@dataclass
class SignalState:
    heart_rate: float
    hrv_rmssd: float
    systolic_bp: float
    diastolic_bp: float
    spo2: float


def _smooth(previous: float, target: float, alpha: float, noise: float) -> float:
    return previous + alpha * (target - previous) + noise


def _round(value: float, digits: int = 2) -> float:
    return round(value, digits)


def _rr_interval_ms(heart_rate: float) -> int:
    if heart_rate <= 0:
        return 0
    return int(round(60000 / heart_rate))


def _target_state(
    profile: PatientProfile,
    segment: ActivitySegment,
    rng: random.Random,
) -> SignalState:
    rule = get_activity_rule(segment.activity_state)
    multiplier = INTENSITY_MULTIPLIER.get(segment.activity_intensity, 1.0)

    hr_delta = rng.gauss(rule.hr_delta_mean * multiplier, rule.hr_delta_std)
    hrv_delta = rule.hrv_delta_mean * multiplier + rng.gauss(0, 2.0)
    sbp_delta = rule.systolic_delta_mean * multiplier + rng.gauss(0, 2.0)
    dbp_delta = rule.diastolic_delta_mean * multiplier + rng.gauss(0, 1.2)
    spo2_delta = rule.spo2_delta_mean * multiplier + rng.gauss(0, 0.15)

    baseline = profile.baseline
    return SignalState(
        heart_rate=rule.heart_rate.clamp(baseline.heart_rate + hr_delta),
        hrv_rmssd=rule.hrv_rmssd.clamp(baseline.hrv_rmssd + hrv_delta),
        systolic_bp=rule.systolic_bp.clamp(baseline.systolic_bp + sbp_delta),
        diastolic_bp=rule.diastolic_bp.clamp(baseline.diastolic_bp + dbp_delta),
        spo2=rule.spo2.clamp(baseline.spo2 + spo2_delta),
    )


def _imu_values(segment: ActivitySegment, second: int, rng: random.Random) -> dict[str, float]:
    rule = get_activity_rule(segment.activity_state)
    multiplier = INTENSITY_MULTIPLIER.get(segment.activity_intensity, 1.0)
    phase = 2 * math.pi * rule.motion_frequency_hz * second

    acc_amp = rule.acc_amplitude * multiplier
    gyro_amp = rule.gyro_amplitude * multiplier

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
) -> Iterator[dict]:
    if sampling_interval_seconds < 1:
        raise ValueError("sampling_interval_seconds must be >= 1")

    rng = random.Random(seed)
    total_seconds = max(segment.end_second for segment in segments)
    current = SignalState(
        heart_rate=profile.baseline.heart_rate,
        hrv_rmssd=profile.baseline.hrv_rmssd,
        systolic_bp=profile.baseline.systolic_bp,
        diastolic_bp=profile.baseline.diastolic_bp,
        spo2=profile.baseline.spo2,
    )

    for message_index, second in enumerate(range(0, total_seconds, sampling_interval_seconds), start=1):
        segment = find_segment(segments, second)
        rule = get_activity_rule(segment.activity_state)
        target = _target_state(profile, segment, rng)

        current = SignalState(
            heart_rate=rule.heart_rate.clamp(
                _smooth(current.heart_rate, target.heart_rate, alpha=0.075, noise=rng.gauss(0, 0.45))
            ),
            hrv_rmssd=rule.hrv_rmssd.clamp(
                _smooth(current.hrv_rmssd, target.hrv_rmssd, alpha=0.06, noise=rng.gauss(0, 0.65))
            ),
            systolic_bp=rule.systolic_bp.clamp(
                _smooth(current.systolic_bp, target.systolic_bp, alpha=0.025, noise=rng.gauss(0, 0.35))
            ),
            diastolic_bp=rule.diastolic_bp.clamp(
                _smooth(current.diastolic_bp, target.diastolic_bp, alpha=0.025, noise=rng.gauss(0, 0.22))
            ),
            spo2=rule.spo2.clamp(
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
        signals.update(_imu_values(segment, second, rng))

        yield {
            "message_id": f"msg_{profile.patient_id}_{message_index:06d}",
            "schema_version": "v1",
            "patient_id": profile.patient_id,
            "device_id": f"SIM_WATCH_{profile.patient_id}",
            "timestamp": format_utc_datetime(timestamp),
            "signals": signals,
        }
