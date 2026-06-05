from __future__ import annotations

from dataclasses import dataclass

from backend.simulator.models import PatientProfile
from backend.simulator.rules import ActivityRule, INTENSITY_MULTIPLIER, Range


@dataclass(frozen=True)
class PersonResponse:
    heart_rate: float = 1.0
    hrv_rmssd: float = 1.0
    systolic_bp: float = 1.0
    diastolic_bp: float = 1.0
    spo2: float = 1.0


PERSONALIZED_RANGE_MARGIN = {
    "heart_rate": 7.0,
    "hrv_rmssd": 9.0,
    "systolic_bp": 8.0,
    "diastolic_bp": 5.0,
    "spo2": 1.0,
}


def get_person_response(profile: PatientProfile) -> PersonResponse:
    hr = 1.0
    hrv = 1.0
    sbp = 1.0
    dbp = 1.0
    spo2 = 1.0

    if profile.lifestyle == "very_active":
        hr *= 0.85
        hrv *= 0.85
        sbp *= 0.92
        dbp *= 0.95
    elif profile.lifestyle in {"low_activity", "sedentary"}:
        hr *= 1.12
        hrv *= 1.10
        sbp *= 1.08
        dbp *= 1.05

    if profile.age_group == "elderly":
        hr *= 1.08
        hrv *= 1.15
        sbp *= 1.18
        dbp *= 1.12
        spo2 *= 1.10

    if profile.pregnancy_status == "pregnant":
        hr *= 1.05
        hrv *= 1.08
        sbp *= 1.05
        dbp *= 1.04

    risk_factors = set(profile.risk_factors)
    if "hypertension_risk" in risk_factors or "blood_pressure_risk" in risk_factors:
        sbp *= 1.12
        dbp *= 1.08
    if "low_spo2_risk" in risk_factors:
        spo2 *= 1.35

    return PersonResponse(
        heart_rate=hr,
        hrv_rmssd=hrv,
        systolic_bp=sbp,
        diastolic_bp=dbp,
        spo2=spo2,
    )


def expected_signal_centers(
    profile: PatientProfile,
    rule: ActivityRule,
    activity_intensity: str,
) -> dict[str, float]:
    multiplier = INTENSITY_MULTIPLIER.get(activity_intensity, 1.0)
    response = get_person_response(profile)
    baseline = profile.baseline
    return {
        "heart_rate": baseline.heart_rate + rule.hr_delta_mean * multiplier * response.heart_rate,
        "hrv_rmssd": baseline.hrv_rmssd + rule.hrv_delta_mean * multiplier * response.hrv_rmssd,
        "systolic_bp": baseline.systolic_bp + rule.systolic_delta_mean * multiplier * response.systolic_bp,
        "diastolic_bp": baseline.diastolic_bp + rule.diastolic_delta_mean * multiplier * response.diastolic_bp,
        "spo2": baseline.spo2 + rule.spo2_delta_mean * multiplier * response.spo2,
    }


def personalized_signal_range(
    profile: PatientProfile,
    rule: ActivityRule,
    activity_intensity: str,
    signal_name: str,
) -> Range:
    generic_range = getattr(rule, signal_name)
    center = expected_signal_centers(profile, rule, activity_intensity)[signal_name]
    if generic_range.minimum <= center <= generic_range.maximum:
        return generic_range

    margin = PERSONALIZED_RANGE_MARGIN[signal_name]
    return Range(center - margin, center + margin)
