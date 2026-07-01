RISK_FACTOR_DEFINITIONS = {
    "blood_pressure_risk": {
        "medical_history": "Blood pressure monitoring recommended",
        "health_status": "WARNING",
        "baseline_adjustments": {"systolic_bp": 8, "diastolic_bp": 4},
    },
    "hypertension_risk": {
        "medical_history": "Hypertension risk monitoring",
        "health_status": "WARNING",
        "baseline_adjustments": {"systolic_bp": 8, "diastolic_bp": 4},
    },
    "fall_risk": {
        "medical_history": "Fall risk monitoring",
        "health_status": "WARNING",
        "baseline_adjustments": {},
    },
    "low_spo2_risk": {
        "medical_history": "Lower normal SpO2 baseline",
        "health_status": "WARNING",
        "baseline_adjustments": {"spo2": -1.5},
    },
    "arrhythmia_risk": {
        "medical_history": "Arrhythmia risk monitoring",
        "health_status": "WARNING",
        "baseline_adjustments": {"heart_rate": 4, "hrv_rmssd": -8},
    },
    "heart_disease_risk": {
        "medical_history": "Heart disease risk monitoring",
        "health_status": "WARNING",
        "baseline_adjustments": {"heart_rate": 3, "systolic_bp": 6, "diastolic_bp": 3, "spo2": -1},
    },
    "afib_risk": {
        "medical_history": "Atrial fibrillation risk monitoring",
        "health_status": "WARNING",
        "baseline_adjustments": {"heart_rate": 5, "hrv_rmssd": -10},
    },
    "diabetes_risk": {
        "medical_history": "Diabetes risk monitoring",
        "health_status": "WARNING",
        "baseline_adjustments": {"systolic_bp": 6, "diastolic_bp": 3},
    },
    "anemia_risk": {
        "medical_history": "Anemia risk monitoring",
        "health_status": "WARNING",
        "baseline_adjustments": {"heart_rate": 7, "spo2": -1},
    },
}

PHYSIOLOGICAL_STATE_DEFINITIONS = {
    "none": {
        "medical_history": "No special physiological state",
        "health_status": "NORMAL",
        "baseline_adjustments": {},
        "allowed_gender": ["male", "female"],
        "allowed_age_group": ["young", "middle_aged", "elderly"],
    },
    "pregnant": {
        "medical_history": "Pregnancy monitoring",
        "health_status": "NORMAL",
        "baseline_adjustments": {},
        "allowed_gender": ["female"],
        "allowed_age_group": ["young"],
    },
}

LIFESTYLE_DEFINITIONS = {
    "very_active": {
        "activity_level": "high",
        "baseline_adjustments": {"heart_rate": -3, "hrv_rmssd": 8},
        "description": "Regular exercise or high daily movement",
    },
    "moderately_active": {
        "activity_level": "medium",
        "baseline_adjustments": {},
        "description": "Normal daily movement",
    },
    "low_activity": {
        "activity_level": "low",
        "baseline_adjustments": {"heart_rate": 4, "hrv_rmssd": -8},
        "description": "Low daily activity",
    },
    "sedentary": {
        "activity_level": "low",
        "baseline_adjustments": {"heart_rate": 4, "hrv_rmssd": -8},
        "description": "Mostly sitting or office-worker lifestyle",
    },
}

WEARABLE_BASELINE_RANGES = {
    "young": {
        "respiratory_rate": {"mean": 16, "std": 1.2, "min": 12, "max": 20},
        "stress_score": {"mean": 32, "std": 8, "min": 12, "max": 55},
        "daily_step_tendency": {"mean": 1.0, "std": 0.12, "min": 0.65, "max": 1.35},
        "sleep_start_offset_minutes": {"mean": 10, "std": 35, "min": -90, "max": 120},
        "sleep_duration_tendency_minutes": {"mean": 455, "std": 45, "min": 330, "max": 570},
        "sleep_fragmentation_tendency": {"mean": 0.18, "std": 0.06, "min": 0.05, "max": 0.40},
        "deep_sleep_tendency": {"mean": 0.22, "std": 0.04, "min": 0.12, "max": 0.32},
        "rem_sleep_tendency": {"mean": 0.23, "std": 0.04, "min": 0.15, "max": 0.33},
        "ppg_noise_level": {"mean": 0.008, "std": 0.002, "min": 0.003, "max": 0.016},
        "ppg_amplitude": {"mean": 1.0, "std": 0.10, "min": 0.75, "max": 1.25},
    },
    "middle_aged": {
        "respiratory_rate": {"mean": 16.5, "std": 1.3, "min": 12, "max": 21},
        "stress_score": {"mean": 35, "std": 8, "min": 12, "max": 60},
        "daily_step_tendency": {"mean": 0.90, "std": 0.13, "min": 0.50, "max": 1.25},
        "sleep_start_offset_minutes": {"mean": -5, "std": 35, "min": -120, "max": 100},
        "sleep_duration_tendency_minutes": {"mean": 440, "std": 50, "min": 315, "max": 555},
        "sleep_fragmentation_tendency": {"mean": 0.22, "std": 0.07, "min": 0.07, "max": 0.46},
        "deep_sleep_tendency": {"mean": 0.18, "std": 0.04, "min": 0.08, "max": 0.28},
        "rem_sleep_tendency": {"mean": 0.21, "std": 0.04, "min": 0.13, "max": 0.31},
        "ppg_noise_level": {"mean": 0.009, "std": 0.0025, "min": 0.003, "max": 0.018},
        "ppg_amplitude": {"mean": 0.98, "std": 0.11, "min": 0.70, "max": 1.23},
    },
    "elderly": {
        "respiratory_rate": {"mean": 17, "std": 1.4, "min": 12, "max": 22},
        "stress_score": {"mean": 38, "std": 9, "min": 15, "max": 65},
        "daily_step_tendency": {"mean": 0.75, "std": 0.15, "min": 0.35, "max": 1.10},
        "sleep_start_offset_minutes": {"mean": -35, "std": 35, "min": -150, "max": 60},
        "sleep_duration_tendency_minutes": {"mean": 420, "std": 55, "min": 300, "max": 540},
        "sleep_fragmentation_tendency": {"mean": 0.30, "std": 0.08, "min": 0.12, "max": 0.55},
        "deep_sleep_tendency": {"mean": 0.14, "std": 0.04, "min": 0.06, "max": 0.24},
        "rem_sleep_tendency": {"mean": 0.20, "std": 0.04, "min": 0.12, "max": 0.30},
        "ppg_noise_level": {"mean": 0.010, "std": 0.003, "min": 0.004, "max": 0.020},
        "ppg_amplitude": {"mean": 0.95, "std": 0.12, "min": 0.65, "max": 1.20},
    },
}

WEARABLE_LIFESTYLE_ADJUSTMENTS = {
    "very_active": {
        "stress_score": -6,
        "daily_step_tendency": 0.30,
        "sleep_fragmentation_tendency": -0.04,
        "deep_sleep_tendency": 0.03,
    },
    "moderately_active": {},
    "low_activity": {
        "stress_score": 6,
        "daily_step_tendency": -0.25,
        "sleep_fragmentation_tendency": 0.04,
        "deep_sleep_tendency": -0.03,
    },
    "sedentary": {
        "stress_score": 8,
        "daily_step_tendency": -0.35,
        "sleep_fragmentation_tendency": 0.06,
        "deep_sleep_tendency": -0.04,
    },
}

WEARABLE_PHYSIOLOGICAL_STATE_ADJUSTMENTS = {
    "none": {},
    "pregnant": {
        "respiratory_rate": 1,
        "stress_score": 4,
        "sleep_fragmentation_tendency": 0.06,
        "sleep_duration_tendency_minutes": 20,
    },
}

WEARABLE_RISK_FACTOR_ADJUSTMENTS = {
    "blood_pressure_risk": {"stress_score": 4},
    "hypertension_risk": {"stress_score": 5},
    "fall_risk": {"daily_step_tendency": -0.20},
    "low_spo2_risk": {"spo2": -1.0},
    "arrhythmia_risk": {"stress_score": 5, "hrv_rmssd_morning": -8},
    "heart_disease_risk": {"stress_score": 4, "hrv_rmssd_morning": -8, "daily_step_tendency": -0.15},
    "afib_risk": {"stress_score": 6, "hrv_rmssd_morning": -10},
    "diabetes_risk": {"stress_score": 5, "daily_step_tendency": -0.10},
    "anemia_risk": {"stress_score": 3, "daily_step_tendency": -0.15},
}

DEMOGRAPHIC_GROUPS = {
    "young_male": {
        "gender": "male",
        "age_group": "young",
        "age_range": [18, 35],
        "default_lifestyle": "moderately_active",
        "default_risk_factors": [],
        "baseline": {
            "heart_rate": {"mean": 67, "std": 4, "min": 60, "max": 75},
            "hrv_rmssd": {"mean": 68, "std": 12, "min": 45, "max": 95},
            "systolic_bp": {"mean": 110, "std": 5, "min": 100, "max": 119},
            "diastolic_bp": {"mean": 70, "std": 5, "min": 60, "max": 79},
            "spo2": {"mean": 98, "std": 1, "min": 96, "max": 100},
        },
    },
    "young_female": {
        "gender": "female",
        "age_group": "young",
        "age_range": [18, 35],
        "default_lifestyle": "moderately_active",
        "default_risk_factors": [],
        "baseline": {
            "heart_rate": {"mean": 72, "std": 4, "min": 65, "max": 80},
            "hrv_rmssd": {"mean": 78, "std": 12, "min": 50, "max": 105},
            "systolic_bp": {"mean": 105, "std": 5, "min": 95, "max": 115},
            "diastolic_bp": {"mean": 67, "std": 4, "min": 58, "max": 76},
            "spo2": {"mean": 98, "std": 1, "min": 96, "max": 100},
        },
    },
    "middle_aged_male": {
        "gender": "male",
        "age_group": "middle_aged",
        "age_range": [36, 64],
        "default_lifestyle": "moderately_active",
        "default_risk_factors": [],
        "baseline": {
            "heart_rate": {"mean": 72, "std": 5, "min": 62, "max": 82},
            "hrv_rmssd": {"mean": 52, "std": 11, "min": 28, "max": 80},
            "systolic_bp": {"mean": 120, "std": 7, "min": 105, "max": 132},
            "diastolic_bp": {"mean": 76, "std": 5, "min": 62, "max": 84},
            "spo2": {"mean": 97, "std": 1, "min": 95, "max": 100},
        },
    },
    "middle_aged_female": {
        "gender": "female",
        "age_group": "middle_aged",
        "age_range": [36, 64],
        "default_lifestyle": "moderately_active",
        "default_risk_factors": [],
        "baseline": {
            "heart_rate": {"mean": 76, "std": 5, "min": 66, "max": 86},
            "hrv_rmssd": {"mean": 56, "std": 11, "min": 30, "max": 86},
            "systolic_bp": {"mean": 116, "std": 7, "min": 100, "max": 128},
            "diastolic_bp": {"mean": 73, "std": 5, "min": 60, "max": 82},
            "spo2": {"mean": 97, "std": 1, "min": 95, "max": 100},
        },
    },
    "pregnant_female": {
        "gender": "female",
        "age_group": "young",
        "pregnancy_status": "pregnant",
        "age_range": [22, 40],
        "default_lifestyle": "moderately_active",
        "default_risk_factors": [],
        "baseline": {
            "heart_rate": {"mean": 82, "std": 5, "min": 70, "max": 90},
            "hrv_rmssd": {"mean": 48, "std": 10, "min": 25, "max": 75},
            "systolic_bp": {"mean": 118, "std": 8, "min": 105, "max": 135},
            "diastolic_bp": {"mean": 76, "std": 6, "min": 60, "max": 85},
            "spo2": {"mean": 98, "std": 1, "min": 95, "max": 100},
        },
    },
    "elderly_male": {
        "gender": "male",
        "age_group": "elderly",
        "age_range": [65, 85],
        "default_lifestyle": "low_activity",
        "default_risk_factors": [],
        "baseline": {
            "heart_rate": {"mean": 76, "std": 5, "min": 65, "max": 85},
            "hrv_rmssd": {"mean": 38, "std": 9, "min": 18, "max": 60},
            "systolic_bp": {"mean": 128, "std": 9, "min": 110, "max": 139},
            "diastolic_bp": {"mean": 80, "std": 6, "min": 65, "max": 89},
            "spo2": {"mean": 96, "std": 1.2, "min": 94, "max": 99},
        },
    },
    "elderly_female": {
        "gender": "female",
        "age_group": "elderly",
        "age_range": [65, 85],
        "default_lifestyle": "low_activity",
        "default_risk_factors": [],
        "baseline": {
            "heart_rate": {"mean": 80, "std": 5, "min": 70, "max": 90},
            "hrv_rmssd": {"mean": 40, "std": 9, "min": 20, "max": 65},
            "systolic_bp": {"mean": 125, "std": 9, "min": 105, "max": 135},
            "diastolic_bp": {"mean": 78, "std": 6, "min": 62, "max": 87},
            "spo2": {"mean": 96, "std": 1.2, "min": 94, "max": 99},
        },
    },
}

DEFAULT_POPULATION_PLAN = {
    "young_male": 2,
    "young_female": 2,
    "middle_aged_male": 2,
    "middle_aged_female": 2,
    "pregnant_female": 2,
    "elderly_male": 2,
    "elderly_female": 2,
}


def _validate_selected_user(selected_user: dict) -> None:
    age_group = selected_user["age_group"]
    gender = selected_user["gender"]
    pregnancy_status = selected_user["pregnancy_status"]
    lifestyle = selected_user["lifestyle"]

    if gender not in {"male", "female"}:
        raise ValueError(f"Unsupported gender={gender!r}. Use 'male' or 'female'.")
    if lifestyle not in LIFESTYLE_DEFINITIONS:
        known = ", ".join(sorted(LIFESTYLE_DEFINITIONS))
        raise ValueError(f"Unsupported lifestyle={lifestyle!r}. Known: {known}")
    if pregnancy_status not in PHYSIOLOGICAL_STATE_DEFINITIONS:
        known = ", ".join(sorted(PHYSIOLOGICAL_STATE_DEFINITIONS))
        raise ValueError(f"Unsupported pregnancy_status={pregnancy_status!r}. Known: {known}")

    state = PHYSIOLOGICAL_STATE_DEFINITIONS[pregnancy_status]
    if gender not in state["allowed_gender"]:
        raise ValueError(f"pregnancy_status={pregnancy_status!r} is not valid for gender={gender!r}.")
    if age_group not in state["allowed_age_group"]:
        raise ValueError(f"pregnancy_status={pregnancy_status!r} is not valid for age_group={age_group!r}.")


def _profile_group_key(age_group: str, gender: str, pregnancy_status: str) -> str:
    if pregnancy_status == "pregnant":
        return "pregnant_female"
    return f"{age_group}_{gender}"


def build_profile_generator_config(
    *,
    enabled: bool,
    seed: int,
    output_path,
    mode: str = "single",
    selected_user: dict | None = None,
    population_plan: dict[str, int] | None = None,
) -> dict:
    if selected_user:
        _validate_selected_user(selected_user)

    return {
        "enabled": enabled,
        "mode": mode,
        "seed": seed,
        "output_path": output_path,
        "selected_user": selected_user,
        "patient_id_template": "P{index:03d}",
        "start_index": 1,
        "population_plan": population_plan or DEFAULT_POPULATION_PLAN,
        "risk_factor_definitions": RISK_FACTOR_DEFINITIONS,
        "physiological_state_definitions": PHYSIOLOGICAL_STATE_DEFINITIONS,
        "lifestyle_definitions": LIFESTYLE_DEFINITIONS,
        "wearable_baseline_ranges": WEARABLE_BASELINE_RANGES,
        "wearable_lifestyle_adjustments": WEARABLE_LIFESTYLE_ADJUSTMENTS,
        "wearable_physiological_state_adjustments": WEARABLE_PHYSIOLOGICAL_STATE_ADJUSTMENTS,
        "wearable_risk_factor_adjustments": WEARABLE_RISK_FACTOR_ADJUSTMENTS,
        "groups": DEMOGRAPHIC_GROUPS,
    }


def build_selected_user(
    *,
    patient_id: str,
    age_group: str,
    gender: str,
    lifestyle: str,
    pregnancy_status: str = "none",
    risk_factors: list[str] | None = None,
    age: int | None = None,
) -> dict:
    profile_group = _profile_group_key(age_group, gender, pregnancy_status)
    if profile_group not in DEMOGRAPHIC_GROUPS:
        known = ", ".join(sorted(DEMOGRAPHIC_GROUPS))
        raise ValueError(
            f"Unsupported demographic selection: age_group={age_group!r}, "
            f"gender={gender!r}, pregnancy_status={pregnancy_status!r}. Known groups: {known}"
        )

    selected_user = {
        "patient_id": patient_id,
        "profile_group": profile_group,
        "age_group": age_group,
        "gender": gender,
        "pregnancy_status": pregnancy_status,
        "lifestyle": lifestyle,
        "risk_factors": risk_factors or [],
        "age": age,
    }
    _validate_selected_user(selected_user)
    return selected_user
