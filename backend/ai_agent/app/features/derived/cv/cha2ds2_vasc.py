from typing import Any

def get_required_features() -> list[str]:
    """
    Returns a list of base feature keys required to calculate CHA2DS2-VASc.
    Typical inputs: age, gender, has_heart_failure, has_hypertension,
    has_stroke_history, has_vascular_disease, has_diabetes.
    """
    return [
        "age",
        "gender",
        "has_heart_failure",
        "has_hypertension",
        "has_stroke_history",
        "has_vascular_disease",
        "has_diabetes",
    ]

def extract(base_features: dict[str, Any]) -> int | None:
    """
    Calculate CHA2DS2-VASc score based on clinical factors.
    - Age >= 75: +2
    - Age 65-74: +1
    - Stroke/TIA history: +2
    - Female gender: +1
    - Heart failure, Hypertension, Vascular disease, Diabetes: +1 each
    """
    try:
        age = base_features.get("age")
        gender = base_features.get("gender")

        if age is None or gender is None:
            return None

        age_val = int(age)
        score = 0

        # Age points
        if age_val >= 75:
            score += 2
        elif 65 <= age_val <= 74:
            score += 1

        # Boolean disease points
        if base_features.get("has_heart_failure") is True:
            score += 1
        if base_features.get("has_hypertension") is True:
            score += 1
        if base_features.get("has_diabetes") is True:
            score += 1
        if base_features.get("has_stroke_history") is True:
            score += 2
        if base_features.get("has_vascular_disease") is True:
            score += 1

        # Gender point (female +1)
        gender_str = str(gender).strip().lower()
        if gender_str in ("nu", "female", "f"):
            score += 1

        return score
    except (ValueError, TypeError):
        return None

