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

AWAKE_ACTIVITY_RULES_BY_LIFESTYLE = {
    "very_active": {
        "start_activity": "sitting",
        "duration_seconds": {
            "sitting": [300, 900],
            "standing": [120, 360],
            "walking": [420, 1200],
            "vigorous_activity": [300, 900],
            "resting": [240, 720],
        },
        "transition_matrix": {
            "sitting": {"standing": 0.20, "walking": 0.40, "vigorous_activity": 0.25, "resting": 0.05, "sitting": 0.10},
            "standing": {"walking": 0.45, "vigorous_activity": 0.25, "sitting": 0.15, "resting": 0.15},
            "walking": {"walking": 0.20, "vigorous_activity": 0.25, "sitting": 0.25, "resting": 0.30},
            "vigorous_activity": {"walking": 0.35, "resting": 0.45, "sitting": 0.20},
            "resting": {"walking": 0.30, "vigorous_activity": 0.20, "sitting": 0.35, "standing": 0.15},
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
