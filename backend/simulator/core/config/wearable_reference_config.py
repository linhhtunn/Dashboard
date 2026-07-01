ACTIVITY_EFFECTS = {
    "sitting": {
        "heart_rate_delta": 0,
        "respiratory_rate_delta": 0,
        "stress_delta": 0,
        "steps_per_minute": [0, 2],
    },
    "standing": {
        "heart_rate_delta": 6,
        "respiratory_rate_delta": 1,
        "stress_delta": 1,
        "steps_per_minute": [0, 8],
    },
    "walking": {
        "heart_rate_delta": 24,
        "respiratory_rate_delta": 5,
        "stress_delta": 6,
        "steps_per_minute": [80, 115],
    },
    "vigorous_activity": {
        "heart_rate_delta": 45,
        "respiratory_rate_delta": 10,
        "stress_delta": 12,
        "steps_per_minute": [130, 180],
    },
    "resting": {
        "heart_rate_delta": -4,
        "respiratory_rate_delta": -1,
        "stress_delta": -8,
        "steps_per_minute": [0, 1],
    },
}

AGE_GROUP_ACTIVITY_EFFECT_MODIFIERS = {
    "young": {
        "standing": {"heart_rate_delta": -1, "respiratory_rate_delta": -0.2, "stress_delta": -1, "steps_multiplier": 1.05},
        "walking": {"heart_rate_delta": -3, "respiratory_rate_delta": -0.5, "stress_delta": -2, "steps_multiplier": 1.10},
        "vigorous_activity": {"heart_rate_delta": -6, "respiratory_rate_delta": -1.0, "stress_delta": -3, "steps_multiplier": 1.15},
    },
    "middle_aged": {
        "standing": {"heart_rate_delta": 0, "respiratory_rate_delta": 0, "stress_delta": 0, "steps_multiplier": 1.00},
        "walking": {"heart_rate_delta": 1, "respiratory_rate_delta": 0.2, "stress_delta": 1, "steps_multiplier": 0.95},
        "vigorous_activity": {"heart_rate_delta": 2, "respiratory_rate_delta": 0.5, "stress_delta": 2, "steps_multiplier": 0.90},
    },
    "elderly": {
        "standing": {"heart_rate_delta": 2, "respiratory_rate_delta": 0.5, "stress_delta": 1, "steps_multiplier": 0.90},
        "walking": {"heart_rate_delta": 5, "respiratory_rate_delta": 1.2, "stress_delta": 3, "steps_multiplier": 0.75},
        "vigorous_activity": {"heart_rate_delta": 8, "respiratory_rate_delta": 2.0, "stress_delta": 5, "steps_multiplier": 0.60},
        "resting": {"heart_rate_delta": 1, "respiratory_rate_delta": 0.2, "stress_delta": 1, "steps_multiplier": 1.00},
    },
}

LIFESTYLE_ACTIVITY_EFFECT_MODIFIERS = {
    "very_active": {
        "walking": {"heart_rate_delta": -4, "respiratory_rate_delta": -0.8, "stress_delta": -3, "steps_multiplier": 1.15},
        "vigorous_activity": {"heart_rate_delta": -8, "respiratory_rate_delta": -1.5, "stress_delta": -5, "steps_multiplier": 1.10},
        "resting": {"heart_rate_delta": -1, "respiratory_rate_delta": 0, "stress_delta": -2, "steps_multiplier": 1.00},
    },
    "moderately_active": {},
    "low_activity": {
        "standing": {"heart_rate_delta": 1, "respiratory_rate_delta": 0.2, "stress_delta": 1, "steps_multiplier": 0.90},
        "walking": {"heart_rate_delta": 4, "respiratory_rate_delta": 0.8, "stress_delta": 3, "steps_multiplier": 0.75},
        "vigorous_activity": {"heart_rate_delta": 6, "respiratory_rate_delta": 1.2, "stress_delta": 5, "steps_multiplier": 0.65},
    },
    "sedentary": {
        "standing": {"heart_rate_delta": 2, "respiratory_rate_delta": 0.3, "stress_delta": 1, "steps_multiplier": 0.85},
        "walking": {"heart_rate_delta": 6, "respiratory_rate_delta": 1.0, "stress_delta": 4, "steps_multiplier": 0.65},
        "vigorous_activity": {"heart_rate_delta": 9, "respiratory_rate_delta": 1.8, "stress_delta": 7, "steps_multiplier": 0.50},
    },
}

AWAKE_ACTIVITY_RULES_BY_LIFESTYLE = {
    "very_active": {
        "start_activity": "sitting",
        "duration_seconds": {
            "sitting": [600, 1800],
            "standing": [120, 420],
            "walking": [240, 900],
            "vigorous_activity": [120, 420],
            "resting": [300, 900],
        },
        "transition_matrix": {
            "sitting": {"sitting": 0.42, "standing": 0.22, "walking": 0.18, "vigorous_activity": 0.04, "resting": 0.14},
            "standing": {"sitting": 0.40, "walking": 0.25, "vigorous_activity": 0.05, "resting": 0.30},
            "walking": {"walking": 0.08, "vigorous_activity": 0.08, "sitting": 0.38, "resting": 0.46},
            "vigorous_activity": {"walking": 0.20, "resting": 0.60, "sitting": 0.20},
            "resting": {"walking": 0.12, "vigorous_activity": 0.03, "sitting": 0.68, "standing": 0.17},
        },
    },
    "moderately_active": {
        "start_activity": "sitting",
        "duration_seconds": {
            "sitting": [600, 1800],
            "standing": [120, 420],
            "walking": [180, 720],
            "vigorous_activity": [120, 420],
            "resting": [300, 900],
        },
        "transition_matrix": {
            "sitting": {"sitting": 0.35, "standing": 0.25, "walking": 0.25, "vigorous_activity": 0.05, "resting": 0.10},
            "standing": {"sitting": 0.35, "walking": 0.40, "vigorous_activity": 0.05, "resting": 0.20},
            "walking": {"sitting": 0.40, "standing": 0.10, "vigorous_activity": 0.10, "resting": 0.40},
            "vigorous_activity": {"walking": 0.35, "resting": 0.50, "sitting": 0.15},
            "resting": {"sitting": 0.50, "standing": 0.20, "walking": 0.20, "vigorous_activity": 0.02, "resting": 0.08},
        },
    },
    "low_activity": {
        "start_activity": "sitting",
        "duration_seconds": {
            "sitting": [900, 2400],
            "standing": [60, 300],
            "walking": [120, 480],
            "vigorous_activity": [60, 180],
            "resting": [420, 1200],
        },
        "transition_matrix": {
            "sitting": {"sitting": 0.50, "standing": 0.20, "walking": 0.08, "vigorous_activity": 0.02, "resting": 0.20},
            "standing": {"sitting": 0.50, "walking": 0.22, "vigorous_activity": 0.03, "resting": 0.25},
            "walking": {"sitting": 0.48, "standing": 0.10, "vigorous_activity": 0.05, "resting": 0.37},
            "vigorous_activity": {"walking": 0.25, "resting": 0.55, "sitting": 0.20},
            "resting": {"sitting": 0.60, "standing": 0.15, "walking": 0.04, "vigorous_activity": 0.01, "resting": 0.20},
        },
    },
    "sedentary": {
        "start_activity": "sitting",
        "duration_seconds": {
            "sitting": [1200, 3000],
            "standing": [45, 240],
            "walking": [60, 300],
            "vigorous_activity": [30, 120],
            "resting": [300, 900],
        },
        "transition_matrix": {
            "sitting": {"sitting": 0.65, "standing": 0.20, "walking": 0.04, "vigorous_activity": 0.01, "resting": 0.10},
            "standing": {"sitting": 0.65, "walking": 0.19, "vigorous_activity": 0.01, "resting": 0.15},
            "walking": {"sitting": 0.64, "standing": 0.10, "vigorous_activity": 0.01, "resting": 0.25},
            "vigorous_activity": {"walking": 0.20, "resting": 0.60, "sitting": 0.20},
            "resting": {"sitting": 0.75, "standing": 0.10, "walking": 0.04, "vigorous_activity": 0.01, "resting": 0.10},
        },
    },
}

SLEEP_STAGE_EFFECTS = {
    "awake": {
        "heart_rate_delta": -5,
        "respiratory_rate_delta": -1,
        "stress_delta": -12,
        "steps_per_minute": [0, 1],
    },
    "light": {
        "heart_rate_delta": -10,
        "respiratory_rate_delta": -2,
        "stress_delta": -18,
        "steps_per_minute": [0, 0],
    },
    "deep": {
        "heart_rate_delta": -16,
        "respiratory_rate_delta": -3,
        "stress_delta": -24,
        "steps_per_minute": [0, 0],
    },
    "rem": {
        "heart_rate_delta": -8,
        "respiratory_rate_delta": -1,
        "stress_delta": -14,
        "steps_per_minute": [0, 0],
    },
}

MOTION_EFFECTS = {
    "sleep": {
        "acc_base": [0.0, 0.0, 0.98],
        "acc_amplitude": [0.003, 0.003, 0.004],
        "acc_noise": 0.004,
        "gyro_amplitude": [0.002, 0.002, 0.002],
        "gyro_noise": 0.002,
        "frequency_hz": 0.10,
    },
    "resting": {
        "acc_base": [0.0, 0.0, 0.98],
        "acc_amplitude": [0.006, 0.006, 0.006],
        "acc_noise": 0.006,
        "gyro_amplitude": [0.004, 0.004, 0.004],
        "gyro_noise": 0.003,
        "frequency_hz": 0.15,
    },
    "sitting": {
        "acc_base": [0.01, 0.02, 0.98],
        "acc_amplitude": [0.010, 0.010, 0.008],
        "acc_noise": 0.008,
        "gyro_amplitude": [0.006, 0.006, 0.005],
        "gyro_noise": 0.004,
        "frequency_hz": 0.20,
    },
    "standing": {
        "acc_base": [0.02, 0.03, 0.98],
        "acc_amplitude": [0.025, 0.020, 0.015],
        "acc_noise": 0.012,
        "gyro_amplitude": [0.020, 0.018, 0.015],
        "gyro_noise": 0.008,
        "frequency_hz": 0.35,
    },
    "walking": {
        "acc_base": [0.03, 0.04, 1.00],
        "acc_amplitude": [0.160, 0.120, 0.080],
        "acc_noise": 0.030,
        "gyro_amplitude": [0.350, 0.280, 0.220],
        "gyro_noise": 0.030,
        "frequency_hz": 1.60,
    },
    "vigorous_activity": {
        "acc_base": [0.04, 0.05, 1.02],
        "acc_amplitude": [0.320, 0.240, 0.180],
        "acc_noise": 0.060,
        "gyro_amplitude": [0.850, 0.700, 0.550],
        "gyro_noise": 0.070,
        "frequency_hz": 2.40,
    },
}

SLEEP_GENERATION_RULES = {
    "sleep_start": "22:45",
    "sleep_start_jitter_minutes": [-90, 90],
    "sleep_duration_minutes": [300, 600],
    "sleep_onset_awake_minutes": [5, 20],
    "cycle_duration_minutes": [80, 110],
    "micro_awake_probability": 0.25,
    "micro_awake_duration_minutes": [1, 8],
    "morning_hrv_delay_minutes": 5,
    "cycle_stage_weights": {
        "early": {"light": 0.45, "deep": 0.40, "rem": 0.15},
        "middle": {"light": 0.55, "deep": 0.25, "rem": 0.20},
        "late": {"light": 0.58, "deep": 0.07, "rem": 0.35},
    },
}

ABNORMALITY_RULES = {
    "enabled": True,
    # Probability per hour for any patient to have an abnormality event start
    "base_probability_per_hour": 0.15,
    # Per-hour boost added for each matching risk factor in patient profile
    "risk_factor_probability_boost": {
        "hypertension_risk":  0.12,
        "blood_pressure_risk": 0.10,
        "heart_disease_risk": 0.10,
        "arrhythmia_risk":    0.12,
        "afib_risk":          0.15,
        "diabetes_risk":      0.07,
        "anemia_risk":        0.06,
        "fall_risk":          0.10,
        "low_spo2_risk":      0.08,
        "elderly":            0.04,
        "pregnancy":          0.03,
        "healthy":            -0.02,
        "active_lifestyle":   -0.01,
    },
    # Multiplier based on overall health status
    "health_status_multiplier": {
        "NORMAL": 1.0,
        "WARNING": 2.5,
        "CRITICAL": 6.0,
    },
    "profiles": [
        {
            "name": "tachycardia",
            "weight": 0.22,
            "duration_minutes": [5, 30],
            "activity_gate": ["sitting", "resting", "standing"],
            "risk_factor_boost": ["hypertension_risk", "blood_pressure_risk", "heart_disease_risk", "arrhythmia_risk", "anemia_risk"],
            "effects": {
                "heart_rate_delta": [38, 58],
                "respiratory_rate_delta": [3, 7],
                "stress_delta": [25, 45],
            },
        },
        {
            "name": "bradycardia",
            "weight": 0.10,
            "duration_minutes": [5, 20],
            "activity_gate": ["sitting", "resting"],
            "risk_factor_boost": ["elderly", "fall_risk", "heart_disease_risk"],
            "effects": {
                "heart_rate_delta": [-22, -12],
                "respiratory_rate_delta": [-2, -0.5],
                "stress_delta": [5, 15],
            },
        },
        {
            "name": "hypertension_episode",
            "weight": 0.20,
            "duration_minutes": [10, 45],
            "activity_gate": None,
            "risk_factor_boost": ["hypertension_risk", "blood_pressure_risk", "diabetes_risk"],
            "effects": {
                "heart_rate_delta": [15, 28],
                "respiratory_rate_delta": [1, 3],
                "stress_delta": [35, 60],
            },
        },
        {
            "name": "arrhythmia_episode",
            "weight": 0.15,
            "duration_minutes": [3, 20],
            "activity_gate": None,
            "risk_factor_boost": ["arrhythmia_risk", "heart_disease_risk"],
            "effects": {
                "heart_rate_delta": [25, 55],
                "respiratory_rate_delta": [2, 6],
                "stress_delta": [20, 40],
            },
        },
        {
            "name": "spo2_drop",
            "weight": 0.12,
            "duration_minutes": [3, 15],
            "activity_gate": ["sleep", "resting"],
            "risk_factor_boost": ["low_spo2_risk", "elderly", "pregnancy", "anemia_risk"],
            "effects": {
                "heart_rate_delta": [8, 18],
                "respiratory_rate_delta": [2, 5],
                "stress_delta": [10, 25],
            },
        },
        {
            "name": "fall_event",
            "weight": 1.00,
            "duration_minutes": [0.5, 2],
            "activity_gate": None,
            "risk_factor_boost": ["fall_risk", "elderly"],
            "effects": {
                "heart_rate_delta": [22, 40],
                "respiratory_rate_delta": [4, 9],
                "stress_delta": [45, 75],
            },
            "motion_spike": True,
        },
        {
            "name": "afib_episode",
            "weight": 0.20,
            "duration_minutes": [5, 25],
            "activity_gate": None,
            "risk_factor_boost": ["arrhythmia_risk", "heart_disease_risk"],
            "effects": {
                "heart_rate_delta": [30, 50],
                "respiratory_rate_delta": [2, 5],
                "stress_delta": [40, 70],
            },
            "ppi_irregular": True,
        },
        {
            "name": "stress_episode",
            "weight": 0.13,
            "duration_minutes": [8, 30],
            "activity_gate": None,
            "risk_factor_boost": ["diabetes_risk"],
            "effects": {
                "heart_rate_delta": [10, 22],
                "respiratory_rate_delta": [1, 4],
                "stress_delta": [38, 62],
            },
        },
    ],
}

SIGNAL_NOISE_RULES = {
    "enabled": True,
    "probability_per_minute": 0.045,
    "max_active_events": 3,
    "activity_multipliers": {
        "sleep": 0.05,
        "resting": 0.50,
        "sitting": 1.25,
        "standing": 1.00,
        "walking": 0.55,
        "vigorous_activity": 0.25,
    },
    "profiles": [
        {
            "name": "minor_physiological_variation",
            "weight": 0.72,
            "duration_seconds": [30, 180],
            "effect_ranges": {
                "heart_rate_delta": [-2, 6],
                "respiratory_rate_delta": [-0.3, 0.8],
                "stress_delta": [-4, 10],
            },
        },
        {
            "name": "moderate_stress_response",
            "weight": 0.23,
            "duration_seconds": [120, 600],
            "effect_ranges": {
                "heart_rate_delta": [4, 14],
                "respiratory_rate_delta": [0.8, 2.5],
                "stress_delta": [14, 32],
            },
        },
        {
            "name": "short_strong_spike",
            "weight": 0.05,
            "duration_seconds": [15, 90],
            "effect_ranges": {
                "heart_rate_delta": [10, 24],
                "respiratory_rate_delta": [1.5, 4.0],
                "stress_delta": [25, 45],
            },
        },
    ],
}

# Extra HR/RR/stress response for pregnant patients (stacked on top of age + lifestyle modifiers)
PREGNANCY_ACTIVITY_EFFECT_MODIFIERS = {
    "sitting":           {"heart_rate_delta": 3,  "respiratory_rate_delta": 0.5,  "stress_delta": 2},
    "standing":          {"heart_rate_delta": 6,  "respiratory_rate_delta": 1.0,  "stress_delta": 4},
    "walking":           {"heart_rate_delta": 10, "respiratory_rate_delta": 2.5,  "stress_delta": 6,  "steps_multiplier": 0.80},
    "vigorous_activity": {"heart_rate_delta": 18, "respiratory_rate_delta": 4.0,  "stress_delta": 12, "steps_multiplier": 0.60},
    "resting":           {"heart_rate_delta": 2,  "respiratory_rate_delta": 0.5,  "stress_delta": 2},
}

# Systolic/diastolic shift (mmHg) when a given abnormality is active at BP measurement time
ABNORM_BP_EFFECTS: dict[str, dict[str, tuple[float, float]]] = {
    "hypertension_episode": {"systolic": (30, 60),  "diastolic": (15, 30)},
    "tachycardia":          {"systolic": (20, 40),  "diastolic": (8,  15)},
    "bradycardia":          {"systolic": (-18, -6), "diastolic": (-10, -3)},
    "spo2_drop":            {"systolic": (5,  15),  "diastolic": (2,   6)},
    "fall_event":           {"systolic": (20, 38),  "diastolic": (10, 18)},
    "stress_episode":       {"systolic": (12, 25),  "diastolic": (5,  12)},
    "afib_episode":         {"systolic": (10, 30),  "diastolic": (5,  15)},
}

# SpO2 delta (%) when a given abnormality is active at SpO2 measurement time
ABNORM_SPO2_EFFECTS: dict[str, tuple[float, float]] = {
    "spo2_drop":            (-8.0, -4.0),
    "hypertension_episode": (-3.0, -1.0),
    "tachycardia":          (-2.0, -1.0),
    "bradycardia":          (-4.0, -2.0),
    "fall_event":           (-4.0, -2.0),
    "stress_episode":       (-2.0,  0.0),
    "afib_episode":         (-3.0, -1.0),
}
