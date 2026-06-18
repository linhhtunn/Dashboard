from typing import Any


def get_required_features() -> list[str]:
    """
    Returns a list of base feature keys required to calculate Heart Failure Stage.
    Typical inputs: has_heart_failure, has_hypertension, has_diabetes, has_vascular_disease.
    """
    return [
        "has_heart_failure",
        "has_hypertension",
        "has_diabetes",
        "has_vascular_disease",
    ]


def extract(base_features: dict[str, Any]) -> str | None:
    """
    Classify the patient's Heart Failure stage based on ACC/AHA classification:
    - Stage C: Symptomatic/diagnosed HF (has_heart_failure is True)
    - Stage A: At risk for HF (no symptoms, but has hypertension, diabetes, or vascular disease)
    - Normal: No heart failure or risk factors
    """
    try:
        has_hf = base_features.get("has_heart_failure")
        has_htn = base_features.get("has_hypertension")
        has_db = base_features.get("has_diabetes")
        has_vd = base_features.get("has_vascular_disease")

        if has_hf is True:
            return "stage_c"

        if any(f is True for f in (has_htn, has_db, has_vd)):
            return "stage_a"

        return "normal"
    except (ValueError, TypeError):
        return None
