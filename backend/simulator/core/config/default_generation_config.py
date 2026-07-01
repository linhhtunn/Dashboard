import copy
from datetime import datetime, timezone
from pathlib import Path

from simulator.core.config.fault_injector_config import build_wearable_fault_injector_config
from simulator.core.config.profile_generation_config import (
    DEMOGRAPHIC_GROUPS,
    build_profile_generator_config,
)
from simulator.core.config.wearable_dev_config import (
    CONTINUOUS_INTERVAL_SECONDS,
    ECG,
    MOTION_BATCH,
    OUTPUT_FILES,
    TRIGGER_SCHEDULE,
    WINDOWS,
)


CONFIG_DIR = Path(__file__).parent
SIMULATOR_DIR = CONFIG_DIR.parent.parent

RUN_NAME = "abnormal_population"
SEED = 42
_today = datetime.now(timezone.utc).date()
START_TIME = f"{_today.isoformat()}T00:00:00Z"
DURATION_HOURS = 24
FAULT_INJECTION_ENABLED = True

# --- Simulation target (used by generate_patient_simulation.py per-patient run) ---
PATIENT_ID = "P001"

# --- Output paths ---
PROFILES_PATH = CONFIG_DIR / "patient_profiles.json"
OUTPUT_DIR = SIMULATOR_DIR / "output" / "abnormal"   # output/normal/ hoặc output/abnormal/
FILE_SUFFIX_TEMPLATE = "{patient_id}"

# ---------------------------------------------------------------------------
# Abnormal population definition
# 5 patients: young M/F, pregnant F, elderly M/F — each with clinical risk factors
# ---------------------------------------------------------------------------
HEALTH_MODE = "abnormal"

ABNORMAL_POPULATION_PLAN = {
    "young_male":       1,   # P001 — young male, BP risk
    "young_female":     1,   # P002 — young female, BP risk
    "pregnant_female":  1,   # P003 — pregnant, preeclampsia risk
    "elderly_male":     1,   # P004 — elderly male, hypertension + fall risk
    "elderly_female":   1,   # P005 — elderly female, hypertension + fall + low SpO2
}

# Risk factors injected per demographic group in abnormal mode
ABNORMAL_RISK_FACTORS_BY_GROUP = {
    "young_male":      ["blood_pressure_risk"],
    "young_female":    ["blood_pressure_risk"],
    "pregnant_female": ["blood_pressure_risk"],
    "elderly_male":    ["hypertension_risk", "fall_risk"],
    "elderly_female":  ["hypertension_risk", "fall_risk", "low_spo2_risk"],
}

# Inject risk factors into group defaults so population-mode generator picks them up
_groups = copy.deepcopy(DEMOGRAPHIC_GROUPS)
for _group_key, _risk_factors in ABNORMAL_RISK_FACTORS_BY_GROUP.items():
    if _group_key in _groups:
        _groups[_group_key]["default_risk_factors"] = _risk_factors

# Build profile generator config (population mode — generates all 5 profiles at once)
PROFILE_GENERATOR_CONFIG = build_profile_generator_config(
    enabled=True,
    mode="population",
    seed=SEED,
    output_path=PROFILES_PATH,
    population_plan=ABNORMAL_POPULATION_PLAN,
)
PROFILE_GENERATOR_CONFIG["groups"] = _groups  # override with risk-factor-injected groups

# ---------------------------------------------------------------------------
WEARABLE_CONFIG = {
    "continuous_interval_seconds": CONTINUOUS_INTERVAL_SECONDS,
    "windows": WINDOWS,
    "motion_batch": MOTION_BATCH,
    "trigger_schedule": TRIGGER_SCHEDULE,
    "ecg": ECG,
}

WEARABLE_FAULT_INJECTOR_CONFIG = build_wearable_fault_injector_config(
    enabled=FAULT_INJECTION_ENABLED,
    max_faults_per_stream=50,
)

LAYERS = {
    "population": {
        "health_mode": HEALTH_MODE,
        "plan": ABNORMAL_POPULATION_PLAN,
        "risk_factors_by_group": ABNORMAL_RISK_FACTORS_BY_GROUP,
    },
    "wearable": {
        "continuous_interval_seconds": CONTINUOUS_INTERVAL_SECONDS,
        "duration_hours": DURATION_HOURS,
        "fault_injection_enabled": FAULT_INJECTION_ENABLED,
    },
}
