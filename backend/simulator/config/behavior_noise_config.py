DEFAULT_ACTIVITY_MULTIPLIERS = {
    "sleeping": 0.25,
    "resting": 0.60,
    "sitting": 1.20,
    "standing": 1.00,
    "walking": 0.80,
    "vigorous_activity": 0.45,
}

DEFAULT_BEHAVIOR_NOISE_PROFILES = [
    {
        "name": "minor_variability",
        "weight": 0.65,
        "duration_seconds": [20, 120],
        "effect_ranges": {
            "heart_rate_delta": [-3, 10],
            "hrv_rmssd_delta": [-8, 4],
            "systolic_bp_delta": [-2, 6],
            "diastolic_bp_delta": [-1, 3],
            "spo2_delta": [-0.2, 0.1],
            "acc_amplitude_delta": [0.0, 0.06],
            "gyro_amplitude_delta": [0.0, 0.05],
            "motion_frequency_multiplier": [0.85, 1.25],
        },
    },
    {
        "name": "moderate_transient",
        "weight": 0.28,
        "duration_seconds": [10, 60],
        "effect_ranges": {
            "heart_rate_delta": [8, 22],
            "hrv_rmssd_delta": [-18, -4],
            "systolic_bp_delta": [5, 14],
            "diastolic_bp_delta": [2, 7],
            "spo2_delta": [-0.3, 0.0],
            "acc_amplitude_delta": [0.04, 0.16],
            "gyro_amplitude_delta": [0.04, 0.14],
            "motion_frequency_multiplier": [1.10, 1.65],
        },
    },
    {
        "name": "strong_short_spike",
        "weight": 0.07,
        "duration_seconds": [3, 18],
        "effect_ranges": {
            "heart_rate_delta": [18, 38],
            "hrv_rmssd_delta": [-28, -8],
            "systolic_bp_delta": [10, 24],
            "diastolic_bp_delta": [4, 10],
            "spo2_delta": [-0.5, 0.0],
            "acc_amplitude_delta": [0.10, 0.35],
            "gyro_amplitude_delta": [0.10, 0.30],
            "motion_frequency_multiplier": [1.35, 2.20],
        },
    },
]


def build_behavior_noise_config(
    *,
    enabled: bool,
    seed: int,
    probability_per_minute: float = 0.22,
) -> dict:
    return {
        "enabled": enabled,
        "seed": seed,
        "probability_per_minute": probability_per_minute,
        "activity_multipliers": DEFAULT_ACTIVITY_MULTIPLIERS,
        "profiles": DEFAULT_BEHAVIOR_NOISE_PROFILES,
    }
