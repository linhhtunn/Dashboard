from typing import Any

def get_required_features() -> list[str]:
    """
    Returns a list of base feature keys required to compute CrCl.
    Typical inputs: age, gender, weight_kg, serum_creatinine.
    """
    return ["age", "gender", "weight_kg", "serum_creatinine"]

def extract(base_features: dict[str, Any]) -> float | None:
    """
    Calculate Cockcroft-Gault Creatinine Clearance (CrCl).
    Formula: ((140 - age) * weight_kg) / (72 * serum_creatinine)
    Multiply by 0.85 for female patients.
    """
    try:
        age = base_features.get("age")
        gender = base_features.get("gender")
        weight_kg = base_features.get("weight_kg")
        serum_creatinine = base_features.get("serum_creatinine")

        if None in (age, gender, weight_kg, serum_creatinine):
            return None

        # Ensure numeric values
        age_val = float(age)
        weight_val = float(weight_kg)
        creat_val = float(serum_creatinine)

        if creat_val <= 0:
            return None

        crcl = ((140.0 - age_val) * weight_val) / (72.0 * creat_val)

        # Apply gender adjustment
        gender_str = str(gender).strip().lower()
        if gender_str in ("nu", "female", "f"):
            crcl *= 0.85

        return round(crcl, 2)
    except (ValueError, TypeError, ZeroDivisionError):
        return None

