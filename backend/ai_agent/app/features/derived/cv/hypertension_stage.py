from typing import Any


def get_required_features() -> list[str]:
    return ["latest_systolic_bp", "latest_diastolic_bp", "has_hypertension"]


def extract(base_features: dict[str, Any]) -> str | None:
    systolic = base_features.get("latest_systolic_bp")
    diastolic = base_features.get("latest_diastolic_bp")

    if systolic is None and diastolic is None:
        return "diagnosed_hypertension" if base_features.get("has_hypertension") is True else None

    try:
        sbp = float(systolic) if systolic is not None else 0.0
        dbp = float(diastolic) if diastolic is not None else 0.0
    except (TypeError, ValueError):
        return "diagnosed_hypertension" if base_features.get("has_hypertension") is True else None

    if sbp >= 180 or dbp >= 120:
        return "severe_range"
    if sbp >= 140 or dbp >= 90:
        return "stage_2"
    if sbp >= 130 or dbp >= 80:
        return "stage_1"
    if sbp >= 120 and dbp < 80:
        return "elevated"
    return "normal"
