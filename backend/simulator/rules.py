from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Range:
    minimum: float
    maximum: float

    def clamp(self, value: float) -> float:
        return max(self.minimum, min(self.maximum, value))

    def as_list(self) -> list[float]:
        return [self.minimum, self.maximum]


@dataclass(frozen=True)
class ActivityRule:
    heart_rate: Range
    hrv_rmssd: Range
    systolic_bp: Range
    diastolic_bp: Range
    spo2: Range
    acc_magnitude: Range
    gyro_magnitude: Range
    hr_delta_mean: float
    hr_delta_std: float
    hrv_delta_mean: float
    systolic_delta_mean: float
    diastolic_delta_mean: float
    spo2_delta_mean: float
    acc_amplitude: float
    gyro_amplitude: float
    motion_frequency_hz: float


# Source of truth: biosignal_reference_summary.md.
# Units are agreed in the data contract, so they are not repeated in messages.
ACTIVITY_RULES: dict[str, ActivityRule] = {
    "sleeping": ActivityRule(
        heart_rate=Range(40, 60),
        hrv_rmssd=Range(40, 100),
        systolic_bp=Range(88, 108),
        diastolic_bp=Range(52, 72),
        spo2=Range(95, 100),
        acc_magnitude=Range(0.9, 1.1),
        gyro_magnitude=Range(0.0, 0.03),
        hr_delta_mean=-14,
        hr_delta_std=3,
        hrv_delta_mean=12,
        systolic_delta_mean=-10,
        diastolic_delta_mean=-6,
        spo2_delta_mean=-0.3,
        acc_amplitude=0.03,
        gyro_amplitude=0.01,
        motion_frequency_hz=0.05,
    ),
    "sitting": ActivityRule(
        heart_rate=Range(55, 75),
        hrv_rmssd=Range(35, 75),
        systolic_bp=Range(100, 120),
        diastolic_bp=Range(60, 80),
        spo2=Range(95, 100),
        acc_magnitude=Range(0.9, 1.15),
        gyro_magnitude=Range(0.0, 0.05),
        hr_delta_mean=1,
        hr_delta_std=3,
        hrv_delta_mean=-4,
        systolic_delta_mean=0,
        diastolic_delta_mean=0,
        spo2_delta_mean=0,
        acc_amplitude=0.04,
        gyro_amplitude=0.02,
        motion_frequency_hz=0.10,
    ),
    "standing": ActivityRule(
        heart_rate=Range(60, 85),
        hrv_rmssd=Range(30, 70),
        systolic_bp=Range(100, 125),
        diastolic_bp=Range(60, 82),
        spo2=Range(95, 100),
        acc_magnitude=Range(0.9, 1.2),
        gyro_magnitude=Range(0.0, 0.1),
        hr_delta_mean=10,
        hr_delta_std=4,
        hrv_delta_mean=-8,
        systolic_delta_mean=4,
        diastolic_delta_mean=2,
        spo2_delta_mean=0,
        acc_amplitude=0.08,
        gyro_amplitude=0.04,
        motion_frequency_hz=0.20,
    ),
    "walking": ActivityRule(
        heart_rate=Range(80, 110),
        hrv_rmssd=Range(20, 55),
        systolic_bp=Range(110, 140),
        diastolic_bp=Range(62, 85),
        spo2=Range(94, 100),
        acc_magnitude=Range(1.0, 2.5),
        gyro_magnitude=Range(0.1, 2.1),
        hr_delta_mean=28,
        hr_delta_std=7,
        hrv_delta_mean=-24,
        systolic_delta_mean=16,
        diastolic_delta_mean=5,
        spo2_delta_mean=-0.2,
        acc_amplitude=0.45,
        gyro_amplitude=0.85,
        motion_frequency_hz=1.55,
    ),
    "vigorous_activity": ActivityRule(
        heart_rate=Range(120, 180),
        hrv_rmssd=Range(10, 35),
        systolic_bp=Range(140, 200),
        diastolic_bp=Range(65, 90),
        spo2=Range(93, 100),
        acc_magnitude=Range(1.5, 4.0),
        gyro_magnitude=Range(0.5, 3.5),
        hr_delta_mean=72,
        hr_delta_std=14,
        hrv_delta_mean=-42,
        systolic_delta_mean=52,
        diastolic_delta_mean=10,
        spo2_delta_mean=-0.8,
        acc_amplitude=1.10,
        gyro_amplitude=1.80,
        motion_frequency_hz=2.35,
    ),
    "resting": ActivityRule(
        heart_rate=Range(55, 75),
        hrv_rmssd=Range(35, 85),
        systolic_bp=Range(95, 120),
        diastolic_bp=Range(58, 80),
        spo2=Range(95, 100),
        acc_magnitude=Range(0.9, 1.12),
        gyro_magnitude=Range(0.0, 0.05),
        hr_delta_mean=-3,
        hr_delta_std=2,
        hrv_delta_mean=4,
        systolic_delta_mean=-3,
        diastolic_delta_mean=-2,
        spo2_delta_mean=0,
        acc_amplitude=0.03,
        gyro_amplitude=0.015,
        motion_frequency_hz=0.08,
    ),
}


INTENSITY_MULTIPLIER: dict[str, float] = {
    "deep": 0.75,
    "light": 0.78,
    "slow": 0.82,
    "relaxed": 0.85,
    "normal": 1.0,
    "fast": 1.18,
    "medium": 1.0,
    "high": 1.22,
    "working": 0.92,
    "stressed": 1.08,
    "animated": 1.04,
}


def get_activity_rule(activity_state: str) -> ActivityRule:
    try:
        return ACTIVITY_RULES[activity_state]
    except KeyError as exc:
        known = ", ".join(sorted(ACTIVITY_RULES))
        raise ValueError(f"Unknown activity_state={activity_state!r}. Known: {known}") from exc
