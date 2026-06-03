from pathlib import Path


CONFIG_DIR = Path(__file__).parent
SIMULATOR_DIR = CONFIG_DIR.parent

RUN_NAME = "p005_normal"
PATIENT_ID = "P005"
PROFILES_PATH = CONFIG_DIR / "patient_profiles.json"
OUTPUT_DIR = SIMULATOR_DIR / "output"

START_TIME = "2026-06-03T10:00:00Z"
SAMPLING_INTERVAL_SECONDS = 1
SEED = 42

FILE_SUFFIX_TEMPLATE = "{patient_id}_{duration_label}"
OUTPUT_FILES = {
    "activity_timeline": "activity_timeline_{suffix}.json",
    "generated_vitals": "generated_vitals_{suffix}.jsonl",
    "scenario_ground_truth": "scenario_ground_truth_{suffix}.json",
    "fault_log": "fault_log_{suffix}.json",
}

TIMELINE_MODE = "generated"  # fixed | template | generated
SCENARIO_ID_TEMPLATE = "SCN_NORMAL_{patient_id}_{index:03d}"
FIXED_TIMELINE_SEGMENTS = [
    {
        "start_minute": 0,
        "end_minute": 20,
        "activity_state": "sitting",
        "activity_intensity": "relaxed",
        "ground_truth_label": "NORMAL",
        "expected_severity": "LOW",
    },
    {
        "start_minute": 20,
        "end_minute": 45,
        "activity_state": "walking",
        "activity_intensity": "normal",
        "ground_truth_label": "NORMAL",
        "expected_severity": "LOW",
    },
    {
        "start_minute": 45,
        "end_minute": 60,
        "activity_state": "resting",
        "activity_intensity": "relaxed",
        "ground_truth_label": "NORMAL",
        "expected_severity": "LOW",
    },
    {
        "start_minute": 60,
        "end_minute": 80,
        "activity_state": "vigorous_activity",
        "activity_intensity": "high",
        "ground_truth_label": "NORMAL",
        "expected_severity": "LOW",
    },
    {
        "start_minute": 80,
        "end_minute": 120,
        "activity_state": "sitting",
        "activity_intensity": "working",
        "ground_truth_label": "NORMAL",
        "expected_severity": "LOW",
    },
]
TIMELINE_TEMPLATE_NAME = None
TIMELINE_TEMPLATES = {}
GENERATED_TIMELINE_RULES = {
    "seed": SEED,
    "duration_minutes": 120,
    "start_activity": "sitting",
    "activity_duration_seconds": {
        "sitting": [600, 1800],
        "standing": [120, 420],
        "walking": [300, 900],
        "resting": [300, 900],
        "vigorous_activity": [300, 900],
        "default": [300, 900],
    },
    "default_intensity_by_activity": {
        "sitting": "working",
        "standing": "normal",
        "walking": "normal",
        "resting": "relaxed",
        "vigorous_activity": "high",
    },
    "transition_matrix": {
        "sitting": {
            "sitting": 0.35,
            "standing": 0.25,
            "walking": 0.25,
            "resting": 0.15,
        },
        "standing": {
            "sitting": 0.35,
            "walking": 0.45,
            "resting": 0.20,
        },
        "walking": {
            "sitting": 0.35,
            "standing": 0.15,
            "resting": 0.20,
            "vigorous_activity": 0.30,
        },
        "resting": {
            "sitting": 0.55,
            "standing": 0.20,
            "walking": 0.15,
            "resting": 0.10,
        },
        "vigorous_activity": {
            "walking": 0.25,
            "resting": 0.55,
            "sitting": 0.20,
        },
    },
    "anchor_segments": [
        {
            "start_minute": 35,
            "end_minute": 45,
            "activity_state": "walking",
            "activity_intensity": "normal",
            "ground_truth_label": "NORMAL",
            "expected_severity": "LOW",
        },
        {
            "start_minute": 60,
            "end_minute": 80,
            "activity_state": "vigorous_activity",
            "activity_intensity": "high",
            "ground_truth_label": "NORMAL",
            "expected_severity": "LOW",
        },
    ],
}

MICRO_EVENT_RULES = {
    "enabled": False,
    "seed": SEED + 1,
    "min_gap_seconds": 90,
    "events": [
        {
            "name": "bathroom_break",
            "allowed_parent_activities": ["sitting", "resting"],
            "probability_per_segment": 0.45,
            "min_parent_duration_seconds": 900,
            "duration_seconds": [180, 360],
            "activity_state": "walking",
            "activity_intensity": "light",
            "context_effects": {
                "heart_rate_delta": 8,
                "hrv_rmssd_delta": -4,
                "systolic_bp_delta": 3,
                "acc_amplitude_delta": 0.08,
                "gyro_amplitude_delta": 0.08,
            },
        },
        {
            "name": "brief_stress",
            "allowed_parent_activities": ["sitting", "standing"],
            "probability_per_segment": 0.35,
            "min_parent_duration_seconds": 600,
            "duration_seconds": [60, 180],
            "activity_intensity": "stressed",
            "context_effects": {
                "heart_rate_delta": 12,
                "hrv_rmssd_delta": -10,
                "systolic_bp_delta": 8,
                "diastolic_bp_delta": 4,
                "gyro_amplitude_delta": 0.03,
            },
        },
        {
            "name": "conversation_laughter",
            "allowed_parent_activities": ["sitting", "standing"],
            "probability_per_segment": 0.35,
            "min_parent_duration_seconds": 600,
            "duration_seconds": [45, 150],
            "activity_intensity": "animated",
            "context_effects": {
                "heart_rate_delta": 6,
                "hrv_rmssd_delta": -3,
                "systolic_bp_delta": 3,
                "acc_amplitude_delta": 0.04,
                "gyro_amplitude_delta": 0.04,
                "motion_frequency_multiplier": 1.2,
            },
        },
    ],
}

BEHAVIOR_NOISE_CONFIG = {
    "enabled": True,
    "seed": SEED + 2,
    "probability_per_minute": 0.22,
    "activity_multipliers": {
        "sleeping": 0.25,
        "resting": 0.60,
        "sitting": 1.20,
        "standing": 1.00,
        "walking": 0.80,
        "vigorous_activity": 0.45,
    },
    "profiles": [
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
    ],
}

FAULT_INJECTOR_CONFIG = {
    "enabled": True,
    "max_faults": 20,
    "probabilities": {
        "missing_timestamp": 0.0010,
        "missing_patient_id": 0.0008,
        "missing_signal": 0.0010,
        "invalid_heart_rate": 0.0012,
        "invalid_spo2": 0.0012,
        "duplicate_message": 0.0010,
        "out_of_order_timestamp": 0.0010,
    },
}

LAYERS = {
    "profile_generator": "static_profile_file",
    "timeline_generator": "markov_generated_segments_with_optional_anchors",
    "normal_signal_generator": "rule_based_temporal_monte_carlo",
    "behavior_noise": "generic_unlabeled_human_variability",
    "abnormal_scenario_injector": None,
    "fault_injector": "probability_based_data_quality_faults",
    "exporter": "json_and_jsonl",
}
