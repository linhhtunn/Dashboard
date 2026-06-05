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

TIMELINE_TEMPLATES = {}

DEFAULT_INTENSITY_BY_ACTIVITY = {
    "sitting": "working",
    "standing": "normal",
    "walking": "normal",
    "resting": "relaxed",
    "vigorous_activity": "high",
}

TIMELINE_RULESETS_BY_LIFESTYLE = {
    "very_active": {
        "start_activity": "sitting",
        "activity_duration_seconds": {
            "sitting": [300, 900],
            "standing": [120, 360],
            "walking": [420, 1200],
            "resting": [240, 720],
            "vigorous_activity": [300, 900],
            "default": [300, 900],
        },
        "transition_matrix": {
            "sitting": {"standing": 0.25, "walking": 0.45, "resting": 0.10, "sitting": 0.20},
            "standing": {"walking": 0.55, "sitting": 0.25, "resting": 0.20},
            "walking": {"vigorous_activity": 0.35, "walking": 0.25, "sitting": 0.20, "resting": 0.20},
            "vigorous_activity": {"walking": 0.45, "resting": 0.40, "sitting": 0.15},
            "resting": {"walking": 0.35, "sitting": 0.45, "standing": 0.20},
        },
        "intensity_options_by_activity": {
            "sitting": {"working": 0.70, "relaxed": 0.30},
            "standing": {"normal": 0.75, "relaxed": 0.25},
            "walking": {"normal": 0.50, "fast": 0.40, "light": 0.10},
            "vigorous_activity": {"high": 0.80, "medium": 0.20},
            "resting": {"relaxed": 1.00},
        },
    },
    "moderately_active": {
        "start_activity": "sitting",
        "activity_duration_seconds": {
            "sitting": [600, 1800],
            "standing": [120, 420],
            "walking": [300, 900],
            "resting": [300, 900],
            "vigorous_activity": [180, 600],
            "default": [300, 900],
        },
        "transition_matrix": {
            "sitting": {"sitting": 0.35, "standing": 0.25, "walking": 0.25, "resting": 0.15},
            "standing": {"sitting": 0.35, "walking": 0.45, "resting": 0.20},
            "walking": {"sitting": 0.40, "standing": 0.15, "resting": 0.30, "vigorous_activity": 0.15},
            "vigorous_activity": {"walking": 0.30, "resting": 0.55, "sitting": 0.15},
            "resting": {"sitting": 0.55, "standing": 0.20, "walking": 0.15, "resting": 0.10},
        },
        "intensity_options_by_activity": {
            "sitting": {"working": 0.65, "relaxed": 0.35},
            "standing": {"normal": 0.80, "relaxed": 0.20},
            "walking": {"normal": 0.60, "light": 0.25, "fast": 0.15},
            "vigorous_activity": {"high": 0.65, "medium": 0.35},
            "resting": {"relaxed": 1.00},
        },
    },
    "low_activity": {
        "start_activity": "sitting",
        "activity_duration_seconds": {
            "sitting": [900, 2400],
            "standing": [60, 300],
            "walking": [120, 480],
            "resting": [420, 1200],
            "default": [300, 900],
        },
        "transition_matrix": {
            "sitting": {"sitting": 0.50, "standing": 0.20, "walking": 0.10, "resting": 0.20},
            "standing": {"sitting": 0.50, "walking": 0.25, "resting": 0.25},
            "walking": {"sitting": 0.50, "standing": 0.10, "resting": 0.40},
            "resting": {"sitting": 0.60, "standing": 0.15, "walking": 0.05, "resting": 0.20},
        },
        "intensity_options_by_activity": {
            "sitting": {"working": 0.55, "relaxed": 0.45},
            "standing": {"normal": 0.65, "relaxed": 0.35},
            "walking": {"light": 0.70, "normal": 0.30},
            "resting": {"relaxed": 1.00},
        },
    },
    "sedentary": {
        "start_activity": "sitting",
        "activity_duration_seconds": {
            "sitting": [1200, 3000],
            "standing": [45, 240],
            "walking": [60, 300],
            "resting": [300, 900],
            "default": [300, 900],
        },
        "transition_matrix": {
            "sitting": {"sitting": 0.65, "standing": 0.20, "walking": 0.05, "resting": 0.10},
            "standing": {"sitting": 0.65, "walking": 0.20, "resting": 0.15},
            "walking": {"sitting": 0.65, "standing": 0.10, "resting": 0.25},
            "resting": {"sitting": 0.75, "standing": 0.10, "walking": 0.05, "resting": 0.10},
        },
        "intensity_options_by_activity": {
            "sitting": {"working": 0.80, "relaxed": 0.20},
            "standing": {"normal": 0.55, "relaxed": 0.45},
            "walking": {"light": 0.85, "normal": 0.15},
            "resting": {"relaxed": 1.00},
        },
    },
}

TIMELINE_MODIFIERS = {
    "pregnant": {
        "remove_activities": ["vigorous_activity"],
        "duration_overrides": {
            "walking": [180, 600],
            "resting": [420, 1200],
        },
        "intensity_overrides": {
            "walking": {"light": 0.65, "normal": 0.35},
            "standing": {"normal": 0.60, "relaxed": 0.40},
        },
    },
    "elderly": {
        "remove_activities": ["vigorous_activity"],
        "duration_overrides": {
            "walking": [120, 540],
            "standing": [60, 300],
            "resting": [420, 1500],
        },
        "intensity_overrides": {
            "walking": {"light": 0.80, "normal": 0.20},
            "standing": {"normal": 0.55, "relaxed": 0.45},
        },
    },
}

MICRO_EVENT_RULES = {
    "enabled": False,
    "min_gap_seconds": 90,
    "events": [],
}


def _copy_ruleset(ruleset: dict) -> dict:
    return {
        "start_activity": ruleset["start_activity"],
        "activity_duration_seconds": {
            activity: list(bounds)
            for activity, bounds in ruleset["activity_duration_seconds"].items()
        },
        "intensity_options_by_activity": {
            activity: dict(options)
            for activity, options in ruleset.get("intensity_options_by_activity", {}).items()
        },
        "transition_matrix": {
            activity: dict(transitions)
            for activity, transitions in ruleset["transition_matrix"].items()
        },
    }


def _remove_activity_from_transitions(rules: dict, activity_to_remove: str) -> None:
    rules["transition_matrix"].pop(activity_to_remove, None)
    for transitions in rules["transition_matrix"].values():
        transitions.pop(activity_to_remove, None)


def _apply_timeline_modifier(rules: dict, modifier: dict) -> None:
    for activity in modifier.get("remove_activities", []):
        _remove_activity_from_transitions(rules, activity)
        rules["activity_duration_seconds"].pop(activity, None)
        rules["intensity_options_by_activity"].pop(activity, None)
    for activity, bounds in modifier.get("duration_overrides", {}).items():
        if activity in rules["activity_duration_seconds"]:
            rules["activity_duration_seconds"][activity] = list(bounds)
    for activity, options in modifier.get("intensity_overrides", {}).items():
        if activity in rules["intensity_options_by_activity"]:
            rules["intensity_options_by_activity"][activity] = dict(options)


def build_generated_timeline_rules(
    *,
    seed: int,
    duration_minutes: int,
    lifestyle: str,
    age_group: str,
    pregnancy_status: str = "none",
) -> dict:
    if lifestyle not in TIMELINE_RULESETS_BY_LIFESTYLE:
        known = ", ".join(sorted(TIMELINE_RULESETS_BY_LIFESTYLE))
        raise ValueError(f"Unsupported timeline lifestyle={lifestyle!r}. Known: {known}")

    rules = _copy_ruleset(TIMELINE_RULESETS_BY_LIFESTYLE[lifestyle])
    if pregnancy_status == "pregnant":
        _apply_timeline_modifier(rules, TIMELINE_MODIFIERS["pregnant"])
    if age_group == "elderly":
        _apply_timeline_modifier(rules, TIMELINE_MODIFIERS["elderly"])

    rules.update(
        {
            "seed": seed,
            "duration_minutes": duration_minutes,
            "lifestyle": lifestyle,
            "age_group": age_group,
            "pregnancy_status": pregnancy_status,
            "default_intensity_by_activity": DEFAULT_INTENSITY_BY_ACTIVITY,
        }
    )
    return rules


def build_micro_event_rules(*, enabled: bool, seed: int) -> dict:
    rules = dict(MICRO_EVENT_RULES)
    rules["enabled"] = enabled
    rules["seed"] = seed
    return rules
