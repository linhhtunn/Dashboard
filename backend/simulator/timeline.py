from __future__ import annotations

import random
from datetime import datetime, timedelta

from backend.simulator.generation_config import TimelineConfig, TimelineSegmentConfig
from backend.simulator.models import ActivitySegment, PatientProfile, format_utc_datetime
from backend.simulator.rules import get_activity_rule
from backend.simulator.signal_expectations import personalized_signal_range


def _segment_config_to_segment(
    profile: PatientProfile,
    config: TimelineConfig,
    segment_config: TimelineSegmentConfig,
    index: int,
) -> ActivitySegment:
    scenario_id = segment_config.scenario_id or config.scenario_id_template.format(
        patient_id=profile.patient_id,
        index=index,
        activity_state=segment_config.activity_state,
    )
    event_type = segment_config.event_type or f"normal_{segment_config.activity_state}"
    return ActivitySegment(
        scenario_id=scenario_id,
        patient_id=profile.patient_id,
        activity_state=segment_config.activity_state,
        activity_intensity=segment_config.activity_intensity,
        start_second=segment_config.start_second,
        end_second=segment_config.end_second,
        event_type=event_type,
        ground_truth_label=segment_config.ground_truth_label,
        expected_severity=segment_config.expected_severity,
        context_event=segment_config.context_event,
        context_effects=segment_config.context_effects or {},
        source=segment_config.source,
    )


def _weighted_choice(rng: random.Random, weights: dict[str, float]) -> str:
    total = sum(max(weight, 0.0) for weight in weights.values())
    if total <= 0:
        return next(iter(weights))
    pick = rng.uniform(0, total)
    cumulative = 0.0
    for key, weight in weights.items():
        cumulative += max(weight, 0.0)
        if pick <= cumulative:
            return key
    return next(reversed(weights))


def _duration_for_activity(rng: random.Random, rules: dict, activity_state: str, remaining: int) -> int:
    duration_rules = rules.get("activity_duration_seconds", {})
    bounds = duration_rules.get(activity_state, duration_rules.get("default", [300, 900]))
    minimum = int(bounds[0])
    maximum = int(bounds[1])
    duration = rng.randint(minimum, maximum)
    return max(1, min(duration, remaining))


def _intensity_for_activity(rng: random.Random, rules: dict, activity_state: str) -> str:
    intensity_options = rules.get("intensity_options_by_activity", {}).get(activity_state)
    if intensity_options:
        return _weighted_choice(rng, intensity_options)
    default_intensity = rules.get("default_intensity_by_activity", {})
    return default_intensity.get(activity_state, "normal")


def _generate_macro_segments(config: TimelineConfig) -> list[TimelineSegmentConfig]:
    rules = config.generated_rules or {}
    rng = random.Random(int(rules.get("seed", 42)))
    duration_seconds = int(rules.get("duration_minutes", 120)) * 60
    start_activity = rules.get("start_activity", "sitting")
    transition_matrix = rules.get("transition_matrix", {})

    segments: list[TimelineSegmentConfig] = []
    current_second = 0
    current_activity = start_activity
    while current_second < duration_seconds:
        remaining = duration_seconds - current_second
        segment_duration = _duration_for_activity(rng, rules, current_activity, remaining)
        segments.append(
            TimelineSegmentConfig(
                activity_state=current_activity,
                activity_intensity=_intensity_for_activity(rng, rules, current_activity),
                start_second=current_second,
                end_second=current_second + segment_duration,
                source="generated_markov",
            )
        )
        current_second += segment_duration
        transitions = transition_matrix.get(current_activity)
        if transitions:
            current_activity = _weighted_choice(rng, transitions)

    return segments


def _can_place_micro_event(start: int, end: int, placements: list[tuple[int, int]], min_gap: int) -> bool:
    for placed_start, placed_end in placements:
        if start < placed_end + min_gap and end + min_gap > placed_start:
            return False
    return True


def _micro_event_segment(
    parent: TimelineSegmentConfig,
    event: dict,
    start_second: int,
    end_second: int,
) -> TimelineSegmentConfig:
    return TimelineSegmentConfig(
        activity_state=event.get("activity_state", parent.activity_state),
        activity_intensity=event.get("activity_intensity", parent.activity_intensity),
        start_second=start_second,
        end_second=end_second,
        event_type=f"context_{event['name']}",
        ground_truth_label="NORMAL",
        expected_severity="LOW",
        context_event=event["name"],
        context_effects=dict(event.get("context_effects", {})),
        source="micro_event",
    )


def _inject_micro_events(segments: list[TimelineSegmentConfig], config: TimelineConfig) -> list[TimelineSegmentConfig]:
    rules = config.micro_event_rules or {}
    if not rules.get("enabled", False):
        return segments

    rng = random.Random(int(rules.get("seed", 43)))
    min_gap = int(rules.get("min_gap_seconds", 120))
    events = list(rules.get("events", []))
    output: list[TimelineSegmentConfig] = []

    for segment in segments:
        duration = segment.end_second - segment.start_second
        placements: list[tuple[int, int, TimelineSegmentConfig]] = []
        for event in events:
            if segment.activity_state not in event.get("allowed_parent_activities", []):
                continue
            if duration < int(event.get("min_parent_duration_seconds", 600)):
                continue
            if rng.random() > float(event.get("probability_per_segment", 0.0)):
                continue

            event_duration_range = event.get("duration_seconds", [30, 120])
            event_duration = rng.randint(int(event_duration_range[0]), int(event_duration_range[1]))
            if event_duration >= duration - 2 * min_gap:
                continue
            latest_start = segment.end_second - min_gap - event_duration
            earliest_start = segment.start_second + min_gap
            if latest_start <= earliest_start:
                continue

            for _ in range(10):
                start_second = rng.randint(earliest_start, latest_start)
                end_second = start_second + event_duration
                if _can_place_micro_event(start_second, end_second, [(item[0], item[1]) for item in placements], min_gap):
                    placements.append(
                        (
                            start_second,
                            end_second,
                            _micro_event_segment(segment, event, start_second, end_second),
                        )
                    )
                    break

        if not placements:
            output.append(segment)
            continue

        cursor = segment.start_second
        for start_second, end_second, micro_segment in sorted(placements, key=lambda item: item[0]):
            if cursor < start_second:
                output.append(
                    TimelineSegmentConfig(
                        activity_state=segment.activity_state,
                        activity_intensity=segment.activity_intensity,
                        start_second=cursor,
                        end_second=start_second,
                        ground_truth_label=segment.ground_truth_label,
                        expected_severity=segment.expected_severity,
                        context_event=segment.context_event,
                        context_effects=segment.context_effects,
                        source=segment.source,
                    )
                )
            output.append(micro_segment)
            cursor = end_second

        if cursor < segment.end_second:
            output.append(
                TimelineSegmentConfig(
                    activity_state=segment.activity_state,
                    activity_intensity=segment.activity_intensity,
                    start_second=cursor,
                    end_second=segment.end_second,
                    ground_truth_label=segment.ground_truth_label,
                    expected_severity=segment.expected_severity,
                    context_event=segment.context_event,
                    context_effects=segment.context_effects,
                    source=segment.source,
                )
            )

    return output


def build_timeline(profile: PatientProfile, config: TimelineConfig) -> list[ActivitySegment]:
    segment_configs = _generate_macro_segments(config) if config.mode == "generated" else list(config.segments)
    segment_configs = _inject_micro_events(segment_configs, config)
    return [
        _segment_config_to_segment(profile, config, segment_config, index)
        for index, segment_config in enumerate(segment_configs, start=1)
    ]


def find_segment(segments: list[ActivitySegment], second: int) -> ActivitySegment:
    for segment in segments:
        if segment.contains(second):
            return segment
    raise ValueError(f"No activity segment covers second={second}")


def timeline_to_json(
    profile: PatientProfile,
    segments: list[ActivitySegment],
    start_time: datetime,
    sampling_interval_seconds: int,
) -> dict:
    return {
        "patient_id": profile.patient_id,
        "start_time": format_utc_datetime(start_time),
        "duration_seconds": max(segment.end_second for segment in segments),
        "sampling_interval_seconds": sampling_interval_seconds,
        "segments": [
            {
                "scenario_id": segment.scenario_id,
                "start_second": segment.start_second,
                "end_second": segment.end_second,
                "event_start": format_utc_datetime(start_time + timedelta(seconds=segment.start_second)),
                "event_end": format_utc_datetime(start_time + timedelta(seconds=segment.end_second)),
                "activity_state": segment.activity_state,
                "activity_intensity": segment.activity_intensity,
                "context_event": segment.context_event,
                "context_effects": segment.context_effects,
                "source": segment.source,
                "ground_truth_label": segment.ground_truth_label,
            }
            for segment in segments
        ],
    }


def ground_truth_to_json(
    profile: PatientProfile,
    segments: list[ActivitySegment],
    start_time: datetime,
) -> list[dict]:
    records: list[dict] = []
    for segment in segments:
        rule = get_activity_rule(segment.activity_state)
        records.append(
            {
                "scenario_id": segment.scenario_id,
                "patient_id": profile.patient_id,
                "event_type": segment.event_type,
                "ground_truth_label": segment.ground_truth_label,
                "event_start": format_utc_datetime(start_time + timedelta(seconds=segment.start_second)),
                "event_end": format_utc_datetime(start_time + timedelta(seconds=segment.end_second)),
                "expected_severity": segment.expected_severity,
                "expected_pattern": {
                    "activity_state": segment.activity_state,
                    "activity_intensity": segment.activity_intensity,
                    "context_event": segment.context_event,
                    "context_effects": segment.context_effects,
                    "heart_rate_range": personalized_signal_range(
                        profile,
                        rule,
                        segment.activity_intensity,
                        "heart_rate",
                    ).as_list(),
                    "hrv_rmssd_range": personalized_signal_range(
                        profile,
                        rule,
                        segment.activity_intensity,
                        "hrv_rmssd",
                    ).as_list(),
                    "systolic_bp_range": personalized_signal_range(
                        profile,
                        rule,
                        segment.activity_intensity,
                        "systolic_bp",
                    ).as_list(),
                    "diastolic_bp_range": personalized_signal_range(
                        profile,
                        rule,
                        segment.activity_intensity,
                        "diastolic_bp",
                    ).as_list(),
                    "spo2_range": personalized_signal_range(
                        profile,
                        rule,
                        segment.activity_intensity,
                        "spo2",
                    ).as_list(),
                    "acc_magnitude_range": rule.acc_magnitude.as_list(),
                    "gyro_magnitude_range": rule.gyro_magnitude.as_list(),
                    "source": "biosignal_reference_summary.md",
                },
            }
        )
    return records
