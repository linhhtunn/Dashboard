from typing import Any


def get_required_features() -> list[str]:
    return ["recent_vitals"]


def extract(base_features: dict[str, Any]) -> float | None:
    for vital in reversed(base_features.get("recent_vitals") or []):
        value = vital.get("diastolic_bp") or vital.get("dia_bp")
        if value is None:
            continue
        try:
            return float(value)
        except (TypeError, ValueError):
            continue
    return None
