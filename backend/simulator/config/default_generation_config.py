from pathlib import Path

from backend.simulator.config.fault_injector_config import build_wearable_fault_injector_config
from backend.simulator.config.profile_generation_config import build_profile_generator_config, build_selected_user
from backend.simulator.config.wearable_dev_config import (
    CONTINUOUS_INTERVAL_SECONDS,
    ECG,
    OUTPUT_FILES,
    TRIGGER_SCHEDULE,
    WINDOWS,
)


CONFIG_DIR = Path(__file__).parent
SIMULATOR_DIR = CONFIG_DIR.parent

# Non-tech run config.
RUN_NAME = "p005_normal"
PATIENT_ID = "P005"
SEED = 42

USER_PROFILE = {
    "age_group": "young",  # young | elderly
    "gender": "female",  # male | female
    "age": 31,
    "pregnancy_status": "pregnant",  # none | pregnant
    "lifestyle": "moderately_active",  # very_active | moderately_active | low_activity | sedentary
}

HEALTH_MODE = "normal"  # normal | abnormal
ABNORMAL_PROFILE = None  # e.g. hypertension_risk, low_spo2_risk

START_TIME = "2026-06-03T00:00:00Z"
DURATION_HOURS = 24
FAULT_INJECTION_ENABLED = True

# Paths.
PROFILES_PATH = CONFIG_DIR / "patient_profiles.json"
OUTPUT_DIR = SIMULATOR_DIR / "output"
FILE_SUFFIX_TEMPLATE = "{patient_id}_{duration_label}"


ABNORMAL_RISK_FACTORS = {
    "hypertension_risk": ["hypertension_risk"],
    "blood_pressure_risk": ["blood_pressure_risk"],
    "low_spo2_risk": ["low_spo2_risk"],
    "fall_risk": ["fall_risk"],
}


def _risk_factors_for_run() -> list[str]:
    if HEALTH_MODE == "normal":
        return []
    if HEALTH_MODE != "abnormal":
        raise ValueError("HEALTH_MODE must be 'normal' or 'abnormal'.")
    if not ABNORMAL_PROFILE:
        raise ValueError("ABNORMAL_PROFILE is required when HEALTH_MODE='abnormal'.")
    if ABNORMAL_PROFILE not in ABNORMAL_RISK_FACTORS:
        known = ", ".join(sorted(ABNORMAL_RISK_FACTORS))
        raise ValueError(f"Unknown ABNORMAL_PROFILE={ABNORMAL_PROFILE!r}. Known: {known}")
    return list(ABNORMAL_RISK_FACTORS[ABNORMAL_PROFILE])


PROFILE_GENERATOR_CONFIG = build_profile_generator_config(
    enabled=True,
    mode="single",
    seed=SEED,
    output_path=PROFILES_PATH,
    selected_user=build_selected_user(
        patient_id=PATIENT_ID,
        age_group=USER_PROFILE["age_group"],
        gender=USER_PROFILE["gender"],
        age=USER_PROFILE["age"],
        pregnancy_status=USER_PROFILE["pregnancy_status"],
        lifestyle=USER_PROFILE["lifestyle"],
        risk_factors=_risk_factors_for_run(),
    ),
)

WEARABLE_CONFIG = {
    "continuous_interval_seconds": CONTINUOUS_INTERVAL_SECONDS,
    "windows": WINDOWS,
    "trigger_schedule": TRIGGER_SCHEDULE,
    "ecg": ECG,
}

WEARABLE_FAULT_INJECTOR_CONFIG = build_wearable_fault_injector_config(
    enabled=FAULT_INJECTION_ENABLED,
    max_faults_per_stream=50,
)

LAYERS = {
    "profile": {
        "patient_id": PATIENT_ID,
        **USER_PROFILE,
        "health_mode": HEALTH_MODE,
        "abnormal_profile": ABNORMAL_PROFILE,
    },
    "wearable": {
        "continuous_interval_seconds": CONTINUOUS_INTERVAL_SECONDS,
        "duration_hours": DURATION_HOURS,
        "fault_injection_enabled": FAULT_INJECTION_ENABLED,
    },
}
