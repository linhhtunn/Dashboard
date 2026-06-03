from pathlib import Path


CONFIG_DIR = Path(__file__).parent
SIMULATOR_DIR = CONFIG_DIR.parent

RUN_NAME = "p001_normal"
PATIENT_ID = "P001"
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
}

TIMELINE_MODE = "fixed"  # fixed | template | generated
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
GENERATED_TIMELINE_RULES = None

LAYERS = {
    "profile_generator": "static_profile_file",
    "timeline_generator": "configured_segments",
    "normal_signal_generator": "rule_based_temporal_monte_carlo",
    "abnormal_scenario_injector": None,
    "fault_injector": None,
    "exporter": "json_and_jsonl",
}
