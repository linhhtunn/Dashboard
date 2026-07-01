from __future__ import annotations

import math
import random
from collections import deque
from datetime import datetime, time, timedelta
from typing import Any, Iterator

from simulator.core.config.wearable_reference_config import (
    ABNORM_BP_EFFECTS,
    ABNORM_SPO2_EFFECTS,
    ACTIVITY_EFFECTS,
    AGE_GROUP_ACTIVITY_EFFECT_MODIFIERS,
    LIFESTYLE_ACTIVITY_EFFECT_MODIFIERS,
    MOTION_EFFECTS,
    PREGNANCY_ACTIVITY_EFFECT_MODIFIERS,
    SIGNAL_NOISE_RULES,
    SLEEP_GENERATION_RULES,
    SLEEP_STAGE_EFFECTS,
)
from simulator.core.abnormal_events import (
    active_abnormality_effects as _active_abnormality_effects,
    build_ppi_intervals_for_window,
    extract_abnormal_episodes,
    maybe_start_abnormality_event as _maybe_start_abnormality_event,
)
from simulator.core.models import PatientProfile, format_utc_datetime
from simulator.core.wearable_timeline import find_master_segment


# ---------------------------------------------------------------------------
# Signal processing helpers
# ---------------------------------------------------------------------------

def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _smooth(previous: float, target: float, alpha: float, noise: float) -> float:
    return previous + alpha * (target - previous) + noise


def _mean(values: deque[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _weighted_choice(rng: random.Random, items: list[dict[str, Any]]) -> dict[str, Any]:
    total = sum(max(float(item["weight"]), 0.0) for item in items)
    if total <= 0:
        return items[0]
    pick = rng.uniform(0, total)
    cumulative = 0.0
    for item in items:
        cumulative += max(float(item["weight"]), 0.0)
        if pick <= cumulative:
            return item
    return items[-1]


def _sample_noise_effects(rng: random.Random, effect_ranges: dict[str, list[float]]) -> dict[str, float]:
    return {
        name: rng.uniform(float(bounds[0]), float(bounds[1]))
        for name, bounds in effect_ranges.items()
    }


# ---------------------------------------------------------------------------
# Noise events
# ---------------------------------------------------------------------------

def _maybe_start_noise_event(
    *,
    rng: random.Random,
    second: int,
    segment: dict[str, Any],
    active_events: list[dict[str, Any]],
) -> None:
    if not SIGNAL_NOISE_RULES["enabled"]:
        return
    if len(active_events) >= int(SIGNAL_NOISE_RULES["max_active_events"]):
        return
    state = "sleep" if segment["kind"] == "sleep" else segment["state"]
    multiplier = float(SIGNAL_NOISE_RULES["activity_multipliers"].get(state, 1.0))
    probability = float(SIGNAL_NOISE_RULES["probability_per_minute"]) * multiplier / 60.0
    if rng.random() >= probability:
        return
    profile = _weighted_choice(rng, SIGNAL_NOISE_RULES["profiles"])
    duration_bounds = profile["duration_seconds"]
    duration_seconds = rng.randint(int(duration_bounds[0]), int(duration_bounds[1]))
    active_events.append({
        "start_second": second,
        "end_second": second + duration_seconds,
        "effects": _sample_noise_effects(rng, profile["effect_ranges"]),
    })


def _active_noise_effects(second: int, active_events: list[dict[str, Any]]) -> dict[str, float]:
    output = {"heart_rate_delta": 0.0, "respiratory_rate_delta": 0.0, "stress_delta": 0.0}
    remaining = []
    for event in active_events:
        if second >= event["end_second"]:
            continue
        duration = max(1, event["end_second"] - event["start_second"])
        progress = (second - event["start_second"]) / duration
        envelope = math.sin(math.pi * max(0.0, min(1.0, progress)))
        for name, value in event["effects"].items():
            output[name] += float(value) * envelope
        remaining.append(event)
    active_events[:] = remaining
    return output


# ---------------------------------------------------------------------------
# Activity effects
# ---------------------------------------------------------------------------

def _apply_activity_modifier(effects: dict[str, Any], modifier: dict[str, float]) -> dict[str, Any]:
    output = {
        "heart_rate_delta": float(effects["heart_rate_delta"]),
        "respiratory_rate_delta": float(effects["respiratory_rate_delta"]),
        "stress_delta": float(effects["stress_delta"]),
        "steps_per_minute": list(effects["steps_per_minute"]),
    }
    for key in ("heart_rate_delta", "respiratory_rate_delta", "stress_delta"):
        output[key] += float(modifier.get(key, 0.0))
    steps_multiplier = float(modifier.get("steps_multiplier", 1.0))
    output["steps_per_minute"] = [
        max(0.0, float(output["steps_per_minute"][0]) * steps_multiplier),
        max(0.0, float(output["steps_per_minute"][1]) * steps_multiplier),
    ]
    return output


def _effects_for_segment(segment: dict[str, Any], profile: PatientProfile) -> dict[str, Any]:
    if segment["kind"] == "sleep":
        return SLEEP_STAGE_EFFECTS[segment["state"]]
    state = segment["state"]
    effects = ACTIVITY_EFFECTS[state]
    age_modifier = AGE_GROUP_ACTIVITY_EFFECT_MODIFIERS.get(profile.age_group, {}).get(state, {})
    lifestyle_modifier = LIFESTYLE_ACTIVITY_EFFECT_MODIFIERS.get(profile.lifestyle, {}).get(state, {})
    result = _apply_activity_modifier(_apply_activity_modifier(effects, age_modifier), lifestyle_modifier)
    if getattr(profile, "pregnancy_status", None) == "pregnant":
        pregnancy_modifier = PREGNANCY_ACTIVITY_EFFECT_MODIFIERS.get(state, {})
        if pregnancy_modifier:
            result = _apply_activity_modifier(result, pregnancy_modifier)
    return result


def _motion_state(segment: dict[str, Any]) -> str:
    return "sleep" if segment["kind"] == "sleep" else segment["state"]


# ---------------------------------------------------------------------------
# Motion helpers — magnitude only (no raw axes in output)
# ---------------------------------------------------------------------------

def _motion_magnitudes(segment: dict[str, Any], t_seconds: float, rng: random.Random) -> tuple[float, float]:
    """Return (acc_magnitude, gyro_magnitude) at time t_seconds."""
    params = MOTION_EFFECTS[_motion_state(segment)]
    phase = 2 * math.pi * float(params["frequency_hz"]) * t_seconds
    acc_base = [float(v) for v in params["acc_base"]]
    acc_amp = [float(v) for v in params["acc_amplitude"]]
    gyro_amp = [float(v) for v in params["gyro_amplitude"]]
    acc_noise = float(params["acc_noise"])
    gyro_noise = float(params["gyro_noise"])

    ax = acc_base[0] + acc_amp[0] * math.sin(phase) + rng.gauss(0, acc_noise)
    ay = acc_base[1] + acc_amp[1] * math.sin(phase + math.pi / 2) + rng.gauss(0, acc_noise)
    az = acc_base[2] + acc_amp[2] * abs(math.sin(phase + math.pi / 4)) + rng.gauss(0, acc_noise)
    gx = gyro_amp[0] * math.sin(phase + math.pi / 6) + rng.gauss(0, gyro_noise)
    gy = gyro_amp[1] * math.sin(phase + math.pi / 3) + rng.gauss(0, gyro_noise)
    gz = gyro_amp[2] * math.sin(phase + math.pi / 2) + rng.gauss(0, gyro_noise)

    return (
        round(math.sqrt(ax**2 + ay**2 + az**2), 4),
        round(math.sqrt(gx**2 + gy**2 + gz**2), 4),
    )


def _fall_shape(start_second: int) -> dict[str, float]:
    """Deterministic per-fall waveform parameters (stable across every sample of the
    same fall, regardless of which 1Hz/10Hz call asks for it). Seeded by the fall's
    onset second so all motion points of one fall agree on the same physical event.

    Calibrated against real wrist-IMU falls (HAR-UP / UP-Fall): ~84% of falls show a
    free-fall dip below 1g before a brief impact spike of a few g, followed by the
    victim lying still."""
    shp = random.Random((int(start_second) * 2654435761) & 0xFFFFFFFF)
    t_dip = shp.uniform(0.30, 0.45)                       # s — bottom of free-fall
    dip_min = shp.uniform(0.30, 0.60)                     # g — weightlessness depth
    t_impact = t_dip + shp.uniform(0.08, 0.16)            # s — ground impact
    impact_peak = shp.uniform(3.0, 6.0)                   # g — collision peak
    t_bounce = t_impact + shp.uniform(0.18, 0.30)         # s — secondary rebound
    bounce_peak = 1.0 + (impact_peak - 1.0) * shp.uniform(0.25, 0.45)
    settle_end = t_bounce + shp.uniform(0.5, 1.0)         # s — transient over -> still
    return {
        "t_dip": t_dip, "dip_min": dip_min,
        "t_impact": t_impact, "impact_peak": impact_peak,
        "t_bounce": t_bounce, "bounce_peak": bounce_peak,
        "settle_end": settle_end,
        "gyro_peak": shp.uniform(3.0, 6.5),              # rad/s — spin at impact
        "gyro_tumble": shp.uniform(1.0, 2.5),           # rad/s — body rotating while falling
    }


def _gauss_bump(t: float, center: float, width: float) -> float:
    return math.exp(-((t - center) ** 2) / (2.0 * width * width))


def _fall_motion_magnitudes(elapsed: float, event: dict[str, Any], rng: random.Random) -> tuple[float, float]:
    """Acc/gyro magnitude (g, rad/s) at `elapsed` seconds since fall onset.

    Realistic fall signature instead of 10s of random chaos:
      1. Loss-of-balance + free-fall -> acc dips below 1g (toward ~0.3-0.6g), gyro rises
      2. Impact                      -> brief sharp acc spike (~3-6g) + gyro spike
      3. Settle                      -> a damped rebound decaying back toward 1g
      4. Post-fall immobility        -> acc ~1g, gyro ~0 (victim lying still on the floor)
    """
    s = _fall_shape(int(event["start_second"]))

    if elapsed <= s["settle_end"]:
        # --- active fall transient ---
        acc = 1.0
        acc -= (1.0 - s["dip_min"]) * _gauss_bump(elapsed, s["t_dip"], 0.13)        # free-fall dip
        acc += (s["impact_peak"] - 1.0) * _gauss_bump(elapsed, s["t_impact"], 0.06)  # impact spike
        acc += (s["bounce_peak"] - 1.0) * _gauss_bump(elapsed, s["t_bounce"], 0.07)  # rebound
        acc += rng.gauss(0, 0.04)

        # gyro: rises during free-fall tumble, peaks at impact, then decays exponentially
        pre_impact = _gauss_bump(elapsed, s["t_dip"], 0.15)        # rotation while falling
        gyro = 0.01 + s["gyro_tumble"] * pre_impact
        gyro += s["gyro_peak"] * _gauss_bump(elapsed, s["t_impact"], 0.06)  # spin at impact
        decay_after = max(0.0, elapsed - s["t_impact"])
        gyro *= math.exp(-decay_after * 3.0)                        # fast exponential decay after impact
        gyro = max(0.01, gyro) + rng.gauss(0, 0.02)
    else:
        # --- post-fall immobility: lying still ---
        acc = 1.0 + rng.gauss(0, 0.03)
        gyro = 0.01 + abs(rng.gauss(0, 0.006))

    return (round(max(0.02, acc), 4), round(max(0.0, gyro), 4))


def _stress_level(score: float) -> str:
    if score <= 20:
        return "rest"
    if score <= 40:
        return "low"
    if score <= 70:
        return "medium"
    return "high"


# ---------------------------------------------------------------------------
# Schedule helpers
# ---------------------------------------------------------------------------

def _parse_hhmm(value: str) -> time:
    hour, minute = value.split(":", maxsplit=1)
    return time(hour=int(hour), minute=int(minute))


def _scheduled_datetimes(start_time: datetime, end_time: datetime, hhmm_values: list[str]) -> list[datetime]:
    output = []
    current_day = start_time.date()
    while current_day <= end_time.date():
        for value in hhmm_values:
            candidate = datetime.combine(current_day, _parse_hhmm(value), tzinfo=start_time.tzinfo)
            if start_time <= candidate < end_time:
                output.append(candidate)
        current_day += timedelta(days=1)
    return sorted(output)


# ---------------------------------------------------------------------------
# Core simulation — single pass, returns per-second records
# ---------------------------------------------------------------------------

def run_wearable_simulation(
    *,
    profile: PatientProfile,
    master_timeline: list[dict[str, Any]],
    start_time: datetime,
    duration_seconds: int,
    wearable_config: dict[str, Any],
    seed: int,
) -> list[dict[str, Any]]:
    """Run full wearable simulation. Returns one dict per second with all computed values."""
    rng = random.Random(seed)
    ppi_window_seconds = int(wearable_config["windows"].get("ppi_seconds", 30))
    hr_window: deque[float] = deque(maxlen=ppi_window_seconds)
    rr_window: deque[float] = deque(maxlen=ppi_window_seconds)

    wbl = profile.wearable_baseline
    base_hr = float(wbl.resting_heart_rate)
    base_rr = float(wbl.respiratory_rate)
    base_stress = float(wbl.stress_score)
    base_ppi_std = float(wbl.ppi_resting_std_ms)

    current_hr = base_hr
    current_rr = base_rr
    current_stress = base_stress
    cumulative_steps = 0
    step_accumulator = 0.0
    current_date = start_time.date()
    active_noise_events: list[dict[str, Any]] = []
    active_abnormality_events: list[dict[str, Any]] = []

    records: list[dict[str, Any]] = []

    for second in range(duration_seconds):
        timestamp = start_time + timedelta(seconds=second)
        if timestamp.date() != current_date:
            current_date = timestamp.date()
            cumulative_steps = 0
            step_accumulator = 0.0

        segment = find_master_segment(master_timeline, timestamp)
        effects = _effects_for_segment(segment, profile)

        _maybe_start_noise_event(rng=rng, second=second, segment=segment, active_events=active_noise_events)
        noise_fx = _active_noise_effects(second, active_noise_events)

        _maybe_start_abnormality_event(
            rng=rng, second=second, profile=profile, segment=segment, active_events=active_abnormality_events,
        )
        anomaly_fx, current_anomaly = _active_abnormality_effects(second, active_abnormality_events)

        target_hr = (
            base_hr
            + float(effects["heart_rate_delta"])
            + noise_fx["heart_rate_delta"]
            + anomaly_fx["heart_rate_delta"]
        )
        target_rr = (
            base_rr
            + float(effects["respiratory_rate_delta"])
            + noise_fx["respiratory_rate_delta"]
            + anomaly_fx["respiratory_rate_delta"]
            + max(0.0, target_hr - base_hr) * 0.035
        )
        target_stress = (
            base_stress
            + float(effects["stress_delta"])
            + noise_fx["stress_delta"]
            + anomaly_fx["stress_delta"]
            + max(0.0, current_hr - base_hr) * 0.10
        )

        current_hr = _clamp(_smooth(current_hr, target_hr, 0.08, rng.gauss(0, 0.35)), 35, 190)
        current_rr = _clamp(_smooth(current_rr, target_rr, 0.05, rng.gauss(0, 0.08)), 8, 35)
        current_stress = _clamp(_smooth(current_stress, target_stress, 0.04, rng.gauss(0, 0.35)), 0, 99)

        step_bounds = effects["steps_per_minute"]
        step_rate = rng.uniform(float(step_bounds[0]), float(step_bounds[1])) * float(wbl.daily_step_tendency) / 60.0
        step_accumulator += step_rate
        steps_this_second = 0
        while step_accumulator >= 1.0:
            cumulative_steps += 1
            steps_this_second += 1
            step_accumulator -= 1.0

        hr_window.append(current_hr)
        rr_window.append(current_rr)
        windowed_hr = _mean(hr_window)
        windowed_rr = _mean(rr_window)

        ppi_std_ms = _clamp(
            base_ppi_std
            - max(0.0, windowed_hr - base_hr) * 0.18
            - max(0.0, current_stress - base_stress) * 0.05
            + rng.gauss(0, max(float(wbl.ppg_noise_level) * 100, 0.8)),
            3, 80,
        )
        # When afib is active, make PPI highly irregular
        if current_anomaly and current_anomaly.get("ppi_irregular"):
            ppi_std_ms = _clamp(ppi_std_ms * 3.0 + rng.uniform(20, 60), 3, 200)

        # 1Hz representative motion sample
        if current_anomaly and current_anomaly.get("motion_spike"):
            fall_elapsed = float(second - current_anomaly["start_second"])
            acc_mag, gyro_mag = _fall_motion_magnitudes(fall_elapsed, current_anomaly, rng)
        else:
            acc_mag, gyro_mag = _motion_magnitudes(segment, float(second), rng)

        activity_type = segment["state"]  # covers both sleep stages and awake activities

        records.append({
            "second": second,
            "timestamp": timestamp,
            "heart_rate": windowed_hr,
            "respiratory_rate": windowed_rr,
            "stress_score": current_stress,
            "ppi_mean_ms": 60000.0 / max(windowed_hr, 1.0),
            "ppi_std_ms": ppi_std_ms,
            "steps_this_second": steps_this_second,
            "cumulative_steps": cumulative_steps,
            "acc_magnitude": acc_mag,
            "gyro_magnitude": gyro_mag,
            "segment": segment,
            "activity_type": activity_type,
            "segment_kind": segment["kind"],
            "abnormality_event": current_anomaly["name"] if current_anomaly else None,
            "ppi_irregular": bool(current_anomaly and current_anomaly.get("ppi_irregular")),
            "fall_event": current_anomaly if (current_anomaly and current_anomaly.get("motion_spike")) else None,
        })

    return records


# ---------------------------------------------------------------------------
# Public generators — all derived from sim_records
# ---------------------------------------------------------------------------

def generate_continuous_records(
    profile: PatientProfile,
    sim_records: list[dict[str, Any]],
) -> Iterator[dict[str, Any]]:
    """1Hz stream: heart_rate and respiratory_rate only."""
    for i, rec in enumerate(sim_records, start=1):
        yield {
            "message_id": f"msg_{profile.patient_id}_cont_{i:06d}",
            "patient_id": profile.patient_id,
            "device_id": f"SIM_WATCH_{profile.patient_id}",
            "timestamp": format_utc_datetime(rec["timestamp"]),
            "heart_rate": int(round(rec["heart_rate"])),
            "respiratory_rate": int(round(rec["respiratory_rate"])),
        }


def generate_steps_records(
    profile: PatientProfile,
    sim_records: list[dict[str, Any]],
) -> Iterator[dict[str, Any]]:
    """60s step summary windows."""
    window_seconds = 60
    msg_index = 0
    i = 0
    while i + window_seconds <= len(sim_records):
        window = sim_records[i: i + window_seconds]
        i += window_seconds
        msg_index += 1

        steps_count = sum(r["steps_this_second"] for r in window)
        counts: dict[str, int] = {}
        for r in window:
            at = r["activity_type"]
            counts[at] = counts.get(at, 0) + 1
        dominant_activity = max(counts, key=counts.get)

        yield {
            "message_id": f"msg_{profile.patient_id}_steps_{msg_index:06d}",
            "patient_id": profile.patient_id,
            "device_id": f"SIM_WATCH_{profile.patient_id}",
            "timestamp": format_utc_datetime(window[-1]["timestamp"]),
            "steps_count": steps_count,
            "steps_rate_per_min": steps_count,
            "activity_type": dominant_activity,
            "interval_seconds": window_seconds,
        }


def generate_stress_records(
    profile: PatientProfile,
    sim_records: list[dict[str, Any]],
) -> Iterator[dict[str, Any]]:
    """60s stress score + level windows."""
    window_seconds = 60
    msg_index = 0
    i = 0
    while i + window_seconds <= len(sim_records):
        window = sim_records[i: i + window_seconds]
        i += window_seconds
        msg_index += 1

        score = int(round(sum(r["stress_score"] for r in window) / len(window)))
        yield {
            "message_id": f"msg_{profile.patient_id}_stress_{msg_index:06d}",
            "patient_id": profile.patient_id,
            "device_id": f"SIM_WATCH_{profile.patient_id}",
            "timestamp": format_utc_datetime(window[-1]["timestamp"]),
            "stress_score": score,
            "stress_level": _stress_level(score),
            "interval_seconds": window_seconds,
        }


def generate_ppi_batch_records(
    profile: PatientProfile,
    sim_records: list[dict[str, Any]],
) -> Iterator[dict[str, Any]]:
    """15s raw PPI patch — beat-to-beat intervals list. Team 2/3 derives HRV."""
    window_seconds = 15
    msg_index = 0
    i = 0
    rng = random.Random(hash(profile.patient_id) ^ 0xABCD)
    while i + window_seconds <= len(sim_records):
        window = sim_records[i: i + window_seconds]
        i += window_seconds
        msg_index += 1

        intervals = build_ppi_intervals_for_window(window, rng, window_seconds=window_seconds)
        # number of beats in the 15s window ≈ HR * 15/60

        win_start = window[0]["timestamp"]
        win_end = window[-1]["timestamp"]
        yield {
            "message_id": f"msg_{profile.patient_id}_ppi_{msg_index:06d}",
            "patient_id": profile.patient_id,
            "device_id": f"SIM_WATCH_{profile.patient_id}",
            "timestamp": format_utc_datetime(win_end),
            "window_start": format_utc_datetime(win_start),
            "window_end": format_utc_datetime(win_end),
            "interval_seconds": window_seconds,
            "ppi_intervals_ms": intervals,
        }


def generate_motion_batch_records(
    profile: PatientProfile,
    sim_records: list[dict[str, Any]],
    wearable_config: dict[str, Any],
    seed: int,
) -> Iterator[dict[str, Any]]:
    """1s motion windows sampled at 10Hz (acc_magnitude, gyro_magnitude)."""
    motion_cfg = wearable_config.get("motion_batch", {})
    sampling_rate_hz = int(motion_cfg.get("sampling_rate_hz", 10))
    window_seconds = int(motion_cfg.get("window_seconds", 1))
    msg_index = 0

    for i in range(0, len(sim_records), window_seconds):
        window = sim_records[i: i + window_seconds]
        if len(window) < window_seconds:
            break
        msg_index += 1
        first = window[0]
        last = window[-1]
        segment = first["segment"]
        fall_event = first.get("fall_event")

        rng = random.Random(seed + first["second"] * 7)
        motion_points = []
        for sample_i in range(sampling_rate_hz * window_seconds):
            t_ms = int(sample_i * 1000 / sampling_rate_hz)
            t_global = float(first["second"]) + sample_i / sampling_rate_hz
            if fall_event:
                fall_elapsed = t_global - float(fall_event["start_second"])
                am, gm = _fall_motion_magnitudes(fall_elapsed, fall_event, rng)
            else:
                am, gm = _motion_magnitudes(segment, t_global, rng)
            motion_points.append({"t_ms": t_ms, "acc_magnitude": am, "gyro_magnitude": gm})

        window_end = first["timestamp"] + timedelta(
            milliseconds=int((sampling_rate_hz * window_seconds - 1) * 1000 / sampling_rate_hz)
        )

        yield {
            "message_id": f"msg_{profile.patient_id}_motion_{msg_index:06d}",
            "patient_id": profile.patient_id,
            "device_id": f"SIM_WATCH_{profile.patient_id}",
            "timestamp": format_utc_datetime(last["timestamp"]),
            "window_start": format_utc_datetime(first["timestamp"]),
            "window_end": format_utc_datetime(window_end),
            "motion_sampling_rate_hz": sampling_rate_hz,
            "motion_points": motion_points,
        }


def generate_battery_records(
    profile: PatientProfile,
    start_time: datetime,
    duration_seconds: int,
    wearable_config: dict[str, Any],
    seed: int,
) -> list[dict[str, Any]]:
    """Battery level every 30 minutes, draining from ~95% to ~75% over 24h."""
    rng = random.Random(seed)
    interval_minutes = int(wearable_config.get("trigger_schedule", {}).get("battery_every_minutes", 30))
    interval_secs = interval_minutes * 60
    end_time = start_time + timedelta(seconds=duration_seconds)
    battery_start = 95.0
    drain_per_hour = 0.85

    records = []
    msg_index = 0
    ts = start_time
    while ts < end_time:
        hours_elapsed = (ts - start_time).total_seconds() / 3600.0
        battery = int(round(_clamp(
            battery_start - drain_per_hour * hours_elapsed + rng.gauss(0, 0.5), 0, 100,
        )))
        msg_index += 1
        records.append({
            "message_id": f"msg_{profile.patient_id}_battery_{msg_index:06d}",
            "patient_id": profile.patient_id,
            "device_id": f"SIM_WATCH_{profile.patient_id}",
            "timestamp": format_utc_datetime(ts),
            "battery_level": battery,
        })
        ts += timedelta(seconds=interval_secs)
    return records


# ---------------------------------------------------------------------------
# Triggered generators (unchanged interface)
# ---------------------------------------------------------------------------

def _abnormality_at(sim_records: list[dict[str, Any]], start_time: datetime, ts: datetime) -> str | None:
    """Return the abnormality event name active at a given timestamp, or None."""
    sec = int((ts - start_time).total_seconds())
    if 0 <= sec < len(sim_records):
        return sim_records[sec]["abnormality_event"]
    return None


def generate_bp_records(
    *,
    profile: PatientProfile,
    start_time: datetime,
    duration_seconds: int,
    wearable_config: dict[str, Any],
    seed: int,
    sim_records: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    end_time = start_time + timedelta(seconds=duration_seconds)
    trigger_times = _scheduled_datetimes(
        start_time, end_time, wearable_config["trigger_schedule"].get("blood_pressure", []),
    )
    records = []
    for index, timestamp in enumerate(trigger_times, start=1):
        evening_adjustment = 2 if timestamp.hour >= 18 else 0
        systolic = float(profile.baseline.systolic_bp) + evening_adjustment
        diastolic = float(profile.baseline.diastolic_bp) + evening_adjustment / 2

        if sim_records:
            event_name = _abnormality_at(sim_records, start_time, timestamp)
            if event_name and event_name in ABNORM_BP_EFFECTS:
                bp_fx = ABNORM_BP_EFFECTS[event_name]
                systolic += rng.uniform(*bp_fx["systolic"])
                diastolic += rng.uniform(*bp_fx["diastolic"])

        systolic = int(round(_clamp(systolic + rng.gauss(0, 3), 80, 220)))
        diastolic = int(round(_clamp(diastolic + rng.gauss(0, 2), 45, 140)))
        if systolic <= diastolic + 15:
            systolic = diastolic + 16
        records.append({
            "message_id": f"msg_{profile.patient_id}_bp_{index:06d}",
            "event_type": "wearable.bp_triggered",
            "trigger_type": "blood_pressure",
            "patient_id": profile.patient_id,
            "device_id": f"SIM_WATCH_{profile.patient_id}",
            "timestamp": format_utc_datetime(timestamp),
            "systolic_bp": systolic,
            "diastolic_bp": diastolic,
        })
    return records


def generate_spo2_records(
    *,
    profile: PatientProfile,
    start_time: datetime,
    duration_seconds: int,
    wearable_config: dict[str, Any],
    seed: int,
    sim_records: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    end_time = start_time + timedelta(seconds=duration_seconds)
    trigger_times = _scheduled_datetimes(
        start_time, end_time, wearable_config["trigger_schedule"].get("spo2", []),
    )
    records = []
    for index, timestamp in enumerate(trigger_times, start=1):
        spo2_base = float(profile.wearable_baseline.spo2)

        if sim_records:
            event_name = _abnormality_at(sim_records, start_time, timestamp)
            if event_name and event_name in ABNORM_SPO2_EFFECTS:
                spo2_base += rng.uniform(*ABNORM_SPO2_EFFECTS[event_name])

        spo2 = int(round(_clamp(spo2_base + rng.gauss(0, 0.35), 85, 100)))
        records.append({
            "message_id": f"msg_{profile.patient_id}_spo2_{index:06d}",
            "event_type": "wearable.spo2_triggered",
            "trigger_type": "spo2",
            "patient_id": profile.patient_id,
            "device_id": f"SIM_WATCH_{profile.patient_id}",
            "timestamp": format_utc_datetime(timestamp),
            "spo2": spo2,
        })
    return records


def _ecg_value(
    t_seconds: float,
    heart_period_seconds: float,
    rng: random.Random,
    *,
    amplitude: float,
    noise_level: float,
) -> float:
    phase = t_seconds % heart_period_seconds

    def wave(center: float, width: float, amp: float) -> float:
        return amp * math.exp(-((phase - center) ** 2) / (2 * width**2))

    p_wave = wave(0.18 * heart_period_seconds, 0.035, 0.08 * amplitude)
    q_wave = wave(0.36 * heart_period_seconds, 0.012, -0.10 * amplitude)
    r_wave = wave(0.40 * heart_period_seconds, 0.010, 1.00 * amplitude)
    s_wave = wave(0.43 * heart_period_seconds, 0.014, -0.22 * amplitude)
    t_wave = wave(0.65 * heart_period_seconds, 0.060, 0.24 * amplitude)
    baseline_wander = 0.025 * math.sin(2 * math.pi * 0.33 * t_seconds)
    return p_wave + q_wave + r_wave + s_wave + t_wave + baseline_wander + rng.gauss(0, noise_level)


def _ecg_points(
    duration_seconds: int,
    sampling_rate_hz: int,
    heart_rate: float,
    seed: int,
    *,
    amplitude: float,
    noise_level: float,
) -> list[dict[str, float]]:
    rng = random.Random(seed)
    heart_period_seconds = 60.0 / max(heart_rate, 1.0)
    points = []
    for sample_index in range(duration_seconds * sampling_rate_hz):
        t_seconds = sample_index / sampling_rate_hz
        points.append({
            "t_ms": int(round(t_seconds * 1000)),
            "value": round(
                _ecg_value(t_seconds, heart_period_seconds, rng, amplitude=amplitude, noise_level=noise_level),
                3,
            ),
        })
    return points


def generate_ecg_records(
    *,
    profile: PatientProfile,
    start_time: datetime,
    duration_seconds: int,
    wearable_config: dict[str, Any],
    seed: int,
) -> list[dict[str, Any]]:
    end_time = start_time + timedelta(seconds=duration_seconds)
    trigger_times = _scheduled_datetimes(
        start_time, end_time, wearable_config["trigger_schedule"].get("ecg", []),
    )
    ecg_config = wearable_config["ecg"]
    records = []
    for index, timestamp in enumerate(trigger_times, start=1):
        records.append({
            "message_id": f"msg_{profile.patient_id}_ecg_{index:06d}",
            "event_type": "wearable.ecg_triggered",
            "trigger_type": "ecg",
            "patient_id": profile.patient_id,
            "device_id": f"SIM_WATCH_{profile.patient_id}",
            "timestamp": format_utc_datetime(timestamp),
            "ecg_rhythm": profile.wearable_baseline.ecg_rhythm,
            "ecg_lead": ecg_config["lead"],
            "ecg_unit": ecg_config["unit"],
            "ecg_sampling_rate_hz": int(ecg_config["sampling_rate_hz"]),
            "ecg_duration_seconds": int(ecg_config["duration_seconds"]),
            "ecg_points": _ecg_points(
                int(ecg_config["duration_seconds"]),
                int(ecg_config["sampling_rate_hz"]),
                profile.wearable_baseline.resting_heart_rate,
                seed + index,
                amplitude=profile.wearable_baseline.ppg_amplitude,
                noise_level=profile.wearable_baseline.ppg_noise_level,
            ),
        })
    return records


def generate_daily_metrics(
    *,
    profile: PatientProfile,
    sleep_sessions: list[dict[str, Any]],
    start_time: datetime,
    duration_seconds: int,
    seed: int,
) -> object:
    rng = random.Random(seed)
    end_time = start_time + timedelta(seconds=duration_seconds)
    delay_minutes = int(SLEEP_GENERATION_RULES["morning_hrv_delay_minutes"])
    records = []
    for session in sleep_sessions:
        measured_at = session["sleep_end"] + timedelta(minutes=delay_minutes)
        if not start_time <= measured_at < end_time:
            continue
        hrv = int(round(_clamp(profile.wearable_baseline.hrv_rmssd_morning + rng.gauss(0, 4), 10, 120)))
        records.append({
            "patient_id": profile.patient_id,
            "date": measured_at.date().isoformat(),
            "measured_at": format_utc_datetime(measured_at),
            "hrv_rmssd_morning": hrv,
        })
    return records[0] if len(records) == 1 else records
