from __future__ import annotations

import random
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from simulator.core.config.wearable_reference_config import (
    AWAKE_ACTIVITY_RULES_BY_LIFESTYLE,
    SLEEP_GENERATION_RULES,
)
from simulator.core.models import PatientProfile, format_utc_datetime


def _parse_hhmm(value: str) -> time:
    hour, minute = value.split(":", maxsplit=1)
    return time(hour=int(hour), minute=int(minute))


def _datetime_on(day: date, value: str) -> datetime:
    parsed = _parse_hhmm(value)
    return datetime.combine(day, parsed, tzinfo=timezone.utc)


def _weighted_choice(rng: random.Random, weights: dict[str, float]) -> str:
    total = sum(max(float(weight), 0.0) for weight in weights.values())
    if total <= 0:
        return next(iter(weights))
    pick = rng.uniform(0, total)
    cumulative = 0.0
    for key, weight in weights.items():
        cumulative += max(float(weight), 0.0)
        if pick <= cumulative:
            return key
    return next(reversed(weights))


def _sleep_rng(seed: int, day: date) -> random.Random:
    return random.Random(seed + day.toordinal() * 7919)


def _random_int_between(rng: random.Random, bounds: list[int]) -> int:
    return rng.randint(int(bounds[0]), int(bounds[1]))


def _sleep_session_for_day(profile: PatientProfile, day: date, seed: int) -> tuple[datetime, datetime]:
    rng = _sleep_rng(seed, day)
    start_jitter = _random_int_between(rng, SLEEP_GENERATION_RULES["sleep_start_jitter_minutes"])
    duration_bounds = SLEEP_GENERATION_RULES["sleep_duration_minutes"]
    duration_minutes = int(
        max(
            int(duration_bounds[0]),
            min(
                int(duration_bounds[1]),
                rng.gauss(float(profile.wearable_baseline.sleep_duration_tendency_minutes), 35),
            ),
        )
    )
    sleep_start = _datetime_on(day, SLEEP_GENERATION_RULES["sleep_start"]) + timedelta(
        minutes=start_jitter + int(profile.wearable_baseline.sleep_start_offset_minutes)
    )
    sleep_end = sleep_start + timedelta(minutes=duration_minutes)
    return sleep_start, sleep_end


def _sleep_sessions(profile: PatientProfile, start_time: datetime, end_time: datetime, seed: int) -> list[dict[str, Any]]:
    sessions = []
    current_day = start_time.date() - timedelta(days=1)
    last_day = end_time.date()
    while current_day <= last_day:
        sleep_start, sleep_end = _sleep_session_for_day(profile, current_day, seed)
        if sleep_start < end_time and sleep_end > start_time:
            rng = _sleep_rng(seed, current_day)
            sessions.append(
                {
                    "date": current_day.isoformat(),
                    "sleep_start": sleep_start,
                    "sleep_end": sleep_end,
                    "stages": _sleep_stages(profile, sleep_start, sleep_end, rng),
                }
            )
        current_day += timedelta(days=1)
    return sessions


def _sleep_phase(elapsed_ratio: float) -> str:
    if elapsed_ratio < 0.33:
        return "early"
    if elapsed_ratio < 0.66:
        return "middle"
    return "late"


def _add_sleep_stage(stages: list[dict[str, Any]], stage: str, start_time: datetime, end_time: datetime) -> None:
    if end_time <= start_time:
        return
    if stages and stages[-1]["stage"] == stage and stages[-1]["end_time"] == start_time:
        stages[-1]["end_time"] = end_time
        return
    stages.append({"stage": stage, "start_time": start_time, "end_time": end_time})


def _cycle_stage_durations(
    profile: PatientProfile,
    rng: random.Random,
    cycle_seconds: int,
    phase: str,
) -> list[tuple[str, int]]:
    cycle_minutes = max(1, cycle_seconds // 60)
    if cycle_minutes < 20:
        return [("light", cycle_minutes * 60)]

    weights = SLEEP_GENERATION_RULES["cycle_stage_weights"][phase]
    deep_multiplier = float(profile.wearable_baseline.deep_sleep_tendency) / 0.20
    rem_multiplier = float(profile.wearable_baseline.rem_sleep_tendency) / 0.22
    adjusted = {
        "light": float(weights["light"]),
        "deep": float(weights["deep"]) * deep_multiplier,
        "rem": float(weights["rem"]) * rem_multiplier,
    }
    total_weight = sum(adjusted.values())
    light_minutes = max(1, int(round(cycle_minutes * adjusted["light"] / total_weight)))
    deep_minutes = max(0, int(round(cycle_minutes * adjusted["deep"] / total_weight)))
    rem_minutes = max(0, cycle_minutes - light_minutes - deep_minutes)
    first_light_minutes = max(1, int(round(light_minutes * rng.uniform(0.45, 0.65))))
    second_light_minutes = max(0, light_minutes - first_light_minutes)
    return [
        ("light", first_light_minutes * 60),
        ("deep", deep_minutes * 60),
        ("light", second_light_minutes * 60),
        ("rem", rem_minutes * 60),
    ]


def _sleep_stages(profile: PatientProfile, sleep_start: datetime, sleep_end: datetime, rng: random.Random) -> list[dict[str, Any]]:
    stages = []
    cursor = sleep_start
    total_sleep_seconds = max(1, int((sleep_end - sleep_start).total_seconds()))

    onset_minutes = _random_int_between(rng, SLEEP_GENERATION_RULES["sleep_onset_awake_minutes"])
    onset_end = min(sleep_end, cursor + timedelta(minutes=onset_minutes))
    _add_sleep_stage(stages, "awake", cursor, onset_end)
    cursor = onset_end

    while cursor < sleep_end:
        remaining_seconds = int((sleep_end - cursor).total_seconds())
        cycle_minutes = _random_int_between(rng, SLEEP_GENERATION_RULES["cycle_duration_minutes"])
        cycle_seconds = min(remaining_seconds, cycle_minutes * 60)
        elapsed_ratio = (cursor - sleep_start).total_seconds() / total_sleep_seconds
        phase = _sleep_phase(elapsed_ratio)

        for stage, duration_seconds in _cycle_stage_durations(profile, rng, cycle_seconds, phase):
            stage_end = min(sleep_end, cursor + timedelta(seconds=duration_seconds))
            _add_sleep_stage(stages, stage, cursor, stage_end)
            cursor = stage_end
            if cursor >= sleep_end:
                break

        remaining_seconds = int((sleep_end - cursor).total_seconds())
        if remaining_seconds <= 0:
            break
        fragmentation_multiplier = float(profile.wearable_baseline.sleep_fragmentation_tendency) / 0.20
        micro_awake_probability = float(SLEEP_GENERATION_RULES["micro_awake_probability"]) * fragmentation_multiplier
        if rng.random() < min(0.80, micro_awake_probability):
            awake_minutes = _random_int_between(rng, SLEEP_GENERATION_RULES["micro_awake_duration_minutes"])
            awake_end = min(sleep_end, cursor + timedelta(minutes=awake_minutes))
            _add_sleep_stage(stages, "awake", cursor, awake_end)
            cursor = awake_end
    return stages


def _duration_for_activity(rng: random.Random, rules: dict[str, Any], activity: str, remaining_seconds: int) -> int:
    bounds = rules["duration_seconds"].get(activity, [300, 900])
    duration = rng.randint(int(bounds[0]), int(bounds[1]))
    return max(1, min(duration, remaining_seconds))


def _generate_awake_segments(
    rng: random.Random,
    profile: PatientProfile,
    gap_start: datetime,
    gap_end: datetime,
) -> list[dict[str, Any]]:
    rules = AWAKE_ACTIVITY_RULES_BY_LIFESTYLE[profile.lifestyle]
    current_activity = rules["start_activity"]
    cursor = gap_start
    segments = []

    while cursor < gap_end:
        remaining = int((gap_end - cursor).total_seconds())
        duration = _duration_for_activity(rng, rules, current_activity, remaining)
        end_time = cursor + timedelta(seconds=duration)
        segments.append(
            {
                "kind": "activity",
                "state": current_activity,
                "start_time": cursor,
                "end_time": end_time,
            }
        )
        cursor = end_time
        transitions = rules["transition_matrix"].get(current_activity)
        if transitions:
            current_activity = _weighted_choice(rng, transitions)

    return segments


def build_master_timeline(
    profile: PatientProfile,
    start_time: datetime,
    duration_seconds: int,
    seed: int,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    end_time = start_time + timedelta(seconds=duration_seconds)
    sleep_sessions = _sleep_sessions(profile, start_time, end_time, seed)
    sleep_stage_segments = [
        {
            "kind": "sleep",
            "state": stage["stage"],
            "start_time": stage["start_time"],
            "end_time": stage["end_time"],
        }
        for session in sleep_sessions
        for stage in session["stages"]
    ]

    rng = random.Random(seed)
    segments = []
    cursor = start_time
    for sleep_segment in sorted(sleep_stage_segments, key=lambda item: item["start_time"]):
        if sleep_segment["end_time"] <= start_time or sleep_segment["start_time"] >= end_time:
            continue
        clipped_sleep = {
            **sleep_segment,
            "start_time": max(sleep_segment["start_time"], start_time),
            "end_time": min(sleep_segment["end_time"], end_time),
        }
        if cursor < clipped_sleep["start_time"]:
            segments.extend(_generate_awake_segments(rng, profile, cursor, clipped_sleep["start_time"]))
        segments.append(clipped_sleep)
        cursor = max(cursor, clipped_sleep["end_time"])

    if cursor < end_time:
        segments.extend(_generate_awake_segments(rng, profile, cursor, end_time))

    return sorted(segments, key=lambda item: item["start_time"]), sleep_sessions


def sleep_sessions_to_json(patient_id: str, sessions: list[dict[str, Any]]) -> object:
    payload = []
    for session in sessions:
        sleep_start = session["sleep_start"]
        sleep_end = session["sleep_end"]
        total_minutes = int(round((sleep_end - sleep_start).total_seconds() / 60))
        detail = []
        for stage in session["stages"]:
            dur = int(round((stage["end_time"] - stage["start_time"]).total_seconds() / 60))
            if dur > 0:
                detail.append({"duration_min": dur, "state": stage["stage"]})
        payload.append({
            "patient_id": patient_id,
            "date": session["date"],
            "start_time": format_utc_datetime(sleep_start),
            "sleep_duration_min": total_minutes,
            "detail": detail,
        })
    return payload[0] if len(payload) == 1 else payload


def activity_timeline_to_json(patient_id: str, master_timeline: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Export master timeline as flat list of activity/sleep segments with start/end times."""
    result = []
    for seg in master_timeline:
        duration_sec = (seg["end_time"] - seg["start_time"]).total_seconds()
        result.append({
            "patient_id": patient_id,
            "kind": seg["kind"],
            "state": seg["state"],
            "start_time": format_utc_datetime(seg["start_time"]),
            "end_time": format_utc_datetime(seg["end_time"]),
            "duration_minutes": round(duration_sec / 60, 1),
        })
    return result


def find_master_segment(segments: list[dict[str, Any]], timestamp: datetime) -> dict[str, Any]:
    for segment in segments:
        if segment["start_time"] <= timestamp < segment["end_time"]:
            return segment
    return segments[-1]
