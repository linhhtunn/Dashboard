from __future__ import annotations

from datetime import datetime, timedelta

from backend.simulator.generation_config import TimelineConfig
from backend.simulator.models import ActivitySegment, PatientProfile, format_utc_datetime
from backend.simulator.rules import get_activity_rule


def build_timeline(profile: PatientProfile, config: TimelineConfig) -> list[ActivitySegment]:
    segments: list[ActivitySegment] = []
    for index, segment_config in enumerate(config.segments, start=1):
        scenario_id = segment_config.scenario_id or config.scenario_id_template.format(
            patient_id=profile.patient_id,
            index=index,
            activity_state=segment_config.activity_state,
        )
        event_type = segment_config.event_type or f"normal_{segment_config.activity_state}"
        segments.append(
            ActivitySegment(
                scenario_id=scenario_id,
                patient_id=profile.patient_id,
                activity_state=segment_config.activity_state,
                activity_intensity=segment_config.activity_intensity,
                start_second=segment_config.start_second,
                end_second=segment_config.end_second,
                event_type=event_type,
                ground_truth_label=segment_config.ground_truth_label,
                expected_severity=segment_config.expected_severity,
            )
        )
    return segments


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
                    "heart_rate_range": rule.heart_rate.as_list(),
                    "hrv_rmssd_range": rule.hrv_rmssd.as_list(),
                    "systolic_bp_range": rule.systolic_bp.as_list(),
                    "diastolic_bp_range": rule.diastolic_bp.as_list(),
                    "spo2_range": rule.spo2.as_list(),
                    "acc_magnitude_range": rule.acc_magnitude.as_list(),
                    "gyro_magnitude_range": rule.gyro_magnitude.as_list(),
                    "source": "biosignal_reference_summary.md",
                },
            }
        )
    return records
