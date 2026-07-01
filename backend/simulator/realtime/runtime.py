from __future__ import annotations

import math
import random
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from statistics import pstdev
from typing import Any
from uuid import uuid4

from simulator.core.abnormal_events import (
    EPISODE_SEVERITY,
    active_abnormality_effects,
    build_abnormal_event,
    build_ppi_intervals_for_window,
)
from simulator.core.config.profile_generation_config import build_profile_generator_config, build_selected_user
from simulator.core.config.wearable_dev_config import MOTION_BATCH, WINDOWS
from simulator.core.config.wearable_reference_config import ABNORM_BP_EFFECTS, ABNORM_SPO2_EFFECTS, ABNORMALITY_RULES
from simulator.core.models import PatientProfile, format_utc_datetime
from simulator.core.profile_generator import generate_patient_profiles
from simulator.core.wearable_signals import (
    _active_noise_effects,
    _clamp,
    _effects_for_segment,
    _fall_motion_magnitudes,
    _mean,
    _maybe_start_noise_event,
    _motion_magnitudes,
    _smooth,
    _stress_level,
)
from simulator.realtime.publisher import RealtimeRabbitPublisher
from observability.trace import writer as observability_writer


ACTIVITY_STATES = ("resting", "sitting", "standing", "walking", "vigorous_activity", "sleep")
ABNORMAL_EVENT_TYPES = (
    "tachycardia",
    "bradycardia",
    "hypertension_episode",
    "spo2_drop",
    "fall_event",
    "afib_episode",
    "stress_episode",
)
SPEEDS = (1, 5, 10, 30)
MIN_ABNORMAL_DURATION_SECONDS = {
    str(profile["name"]): int(float(profile["duration_minutes"][0]) * 60)
    for profile in ABNORMALITY_RULES.get("profiles", [])
    if profile.get("name") in ABNORMAL_EVENT_TYPES
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def age_group_for(age: int) -> str:
    if age <= 35:
        return "young"
    if age <= 64:
        return "middle_aged"
    return "elderly"


def compute_rmssd(intervals: list[int]) -> float | None:
    if len(intervals) < 2:
        return None
    diffs = [intervals[index] - intervals[index - 1] for index in range(1, len(intervals))]
    return round(math.sqrt(sum(diff * diff for diff in diffs) / len(diffs)), 2)


def compute_irregularity(intervals: list[int]) -> float | None:
    if len(intervals) < 2:
        return None
    mean_ppi = sum(intervals) / len(intervals)
    if mean_ppi <= 0:
        return None
    return round(pstdev(intervals) / mean_ppi, 4)


def build_profile(
    *,
    patient_id: str,
    name: str,
    age: int,
    gender: str,
    lifestyle: str,
    health_status: str,
    risk_factors: list[str],
    pregnancy_status: str = "none",
    seed: int = 42,
) -> PatientProfile:
    age_group = age_group_for(age)
    selected_user = build_selected_user(
        patient_id=patient_id,
        age_group=age_group,
        gender=gender,
        lifestyle=lifestyle,
        pregnancy_status=pregnancy_status,
        risk_factors=risk_factors,
        age=age,
    )
    config = build_profile_generator_config(
        enabled=True,
        mode="single",
        seed=seed,
        output_path=Path("realtime_patient_profiles.json"),
        selected_user=selected_user,
    )
    profile_data = generate_patient_profiles(config)[0]
    profile_data["name"] = name
    profile_data["health_status"] = health_status
    return PatientProfile.from_dict(profile_data)


@dataclass
class RealtimeRunConfig:
    name: str = "Realtime Demo Patient"
    patient_id: str | None = None
    patient_source: str = "sandbox"
    age: int = 68
    gender: str = "male"
    lifestyle: str = "low_activity"
    health_status: str = "WARNING"
    risk_factors: list[str] = field(default_factory=lambda: ["hypertension_risk", "fall_risk"])
    pregnancy_status: str = "none"
    activity: str = "resting"
    speed: int = 1
    duration_seconds: int | None = None
    publish_rabbitmq: bool = False
    validate_existing_patient: bool = False
    seed: int = 42


class RealtimeSimulationRun:
    def __init__(
        self,
        *,
        run_id: str,
        config: RealtimeRunConfig,
        env_path: Path | None = None,
    ) -> None:
        self.run_id = run_id
        self.config = config
        self.patient_source = self._normalize_patient_source(config.patient_source)
        self.validate_existing_patient = bool(config.validate_existing_patient)
        if self.patient_source == "existing" and not config.patient_id:
            raise ValueError("patient_id is required when patient_source is existing")
        patient_id = config.patient_id or f"SIM-{run_id[:8].upper()}"
        self.profile = build_profile(
            patient_id=patient_id,
            name=config.name,
            age=config.age,
            gender=config.gender,
            lifestyle=config.lifestyle,
            health_status=config.health_status,
            risk_factors=config.risk_factors,
            pregnancy_status=config.pregnancy_status,
            seed=config.seed,
        )
        self.env_path = env_path
        self.start_time = utc_now()
        self.current_second = 0
        self.status = "created"
        self.current_activity = self._normalize_activity(config.activity)
        self.speed = self._normalize_speed(config.speed)
        self.duration_seconds = config.duration_seconds
        self.publish_rabbitmq = self._publish_allowed(bool(config.publish_rabbitmq))
        if self.publish_rabbitmq:
            self._validate_existing_patient_for_publish()
        self.publisher = RealtimeRabbitPublisher(enabled=self.publish_rabbitmq, env_path=env_path)

        self._lock = threading.RLock()
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._last_wall = time.perf_counter()
        self._sim_accumulator = 0.0
        self._rng = random.Random(config.seed)
        self._ppi_rng = random.Random(config.seed ^ 0xABCD)
        self._motion_seed = config.seed + 2000

        wbl = self.profile.wearable_baseline
        self._base_hr = float(wbl.resting_heart_rate)
        self._base_rr = float(wbl.respiratory_rate)
        self._base_stress = float(wbl.stress_score)
        self._base_ppi_std = float(wbl.ppi_resting_std_ms)
        self._current_hr = self._base_hr
        self._current_rr = self._base_rr
        self._current_stress = self._base_stress
        self._current_date = self.start_time.date()
        self._cumulative_steps = 0
        self._step_accumulator = 0.0
        ppi_window_seconds = int(WINDOWS.get("ppi_seconds", 30))
        self._hr_window: deque[float] = deque(maxlen=ppi_window_seconds)
        self._rr_window: deque[float] = deque(maxlen=ppi_window_seconds)
        self._records: deque[dict[str, Any]] = deque(maxlen=3600)
        self._samples: deque[dict[str, Any]] = deque(maxlen=240)
        self._raw_feed: deque[dict[str, Any]] = deque(maxlen=120)
        self._ground_truth_events: list[dict[str, Any]] = []
        self._active_noise_events: list[dict[str, Any]] = []
        self._active_abnormal_events: list[dict[str, Any]] = []
        self._errors: deque[dict[str, Any]] = deque(maxlen=30)
        self._counters: dict[str, int] = {
            "continuous": 0,
            "motion": 0,
            "ppi": 0,
            "bp": 0,
            "spo2": 0,
            "steps": 0,
            "stress": 0,
        }
        self._latest: dict[str, Any] = {
            "continuous": None,
            "motion_batch": None,
            "ppi_batch": None,
            "bp_triggered": None,
            "spo2_triggered": None,
            "steps_event": None,
            "stress": None,
        }
        self._latest_bp = {
            "systolic_bp": int(round(self.profile.baseline.systolic_bp)),
            "diastolic_bp": int(round(self.profile.baseline.diastolic_bp)),
        }
        self._latest_spo2 = int(round(self.profile.wearable_baseline.spo2))
        self._last_fall_spike_second: int | None = None

    def start(self) -> dict[str, Any]:
        with self._lock:
            if self.status in {"stopped", "completed"}:
                self.reset()
            if self.status == "created" and self.current_second == 0 and not self._records:
                self._realign_start_time(utc_now())
            self.status = "running"
            self._last_wall = time.perf_counter()
            self._sim_accumulator = 0.0
            self._stop_event.clear()
            if self._thread is None or not self._thread.is_alive():
                self._thread = threading.Thread(target=self._loop, name=f"simulator-{self.run_id}", daemon=True)
                self._thread.start()
            return self.snapshot()

    def pause(self) -> dict[str, Any]:
        with self._lock:
            if self.status == "running":
                self.status = "paused"
                self.publisher.close(drain=False)
                self.publisher = RealtimeRabbitPublisher(enabled=self.publish_rabbitmq, env_path=self.env_path)
            return self.snapshot()

    def resume(self) -> dict[str, Any]:
        with self._lock:
            if self.status == "paused":
                self.status = "running"
                self._last_wall = time.perf_counter()
                self._sim_accumulator = 0.0
                self.publisher = RealtimeRabbitPublisher(enabled=self.publish_rabbitmq, env_path=self.env_path)
            return self.snapshot()

    def stop(self) -> dict[str, Any]:
        with self._lock:
            self.status = "stopped"
            self.publish_rabbitmq = False
            self._stop_event.set()
            self.publisher.close(drain=False)
            self.publisher = RealtimeRabbitPublisher(enabled=False, env_path=self.env_path)
            return self.snapshot()

    def reset(self) -> dict[str, Any]:
        with self._lock:
            self.status = "created"
            self.current_second = 0
            self.start_time = utc_now()
            self._current_hr = self._base_hr
            self._current_rr = self._base_rr
            self._current_stress = self._base_stress
            self._current_date = self.start_time.date()
            self._cumulative_steps = 0
            self._step_accumulator = 0.0
            self._hr_window.clear()
            self._rr_window.clear()
            self._records.clear()
            self._samples.clear()
            self._raw_feed.clear()
            self._ground_truth_events.clear()
            self._active_noise_events.clear()
            self._active_abnormal_events.clear()
            self._errors.clear()
            for key in self._counters:
                self._counters[key] = 0
            for key in self._latest:
                self._latest[key] = None
            self._latest_bp = {
                "systolic_bp": int(round(self.profile.baseline.systolic_bp)),
                "diastolic_bp": int(round(self.profile.baseline.diastolic_bp)),
            }
            self._latest_spo2 = int(round(self.profile.wearable_baseline.spo2))
            self._last_fall_spike_second = None
            self.publisher.close(drain=False)
            self.publisher = RealtimeRabbitPublisher(enabled=self.publish_rabbitmq, env_path=self.env_path)
            return self.snapshot()

    def _realign_start_time(self, start_time: datetime) -> None:
        self.start_time = start_time
        self._current_date = self.start_time.date()
        active_events = list(self._active_abnormal_events)
        for index, event in enumerate(self._ground_truth_events):
            if event.get("status") != "active" or index >= len(active_events):
                continue
            source = active_events[index]
            start_second = int(source["start_second"])
            end_second = int(source["end_second"])
            event["start_time"] = format_utc_datetime(self.start_time + timedelta(seconds=start_second))
            event["end_time"] = format_utc_datetime(self.start_time + timedelta(seconds=end_second))

    def set_activity(self, activity: str) -> dict[str, Any]:
        with self._lock:
            self.current_activity = self._normalize_activity(activity)
            return self.snapshot()

    def set_speed(self, speed: int) -> dict[str, Any]:
        with self._lock:
            self.speed = self._normalize_speed(speed)
            self._last_wall = time.perf_counter()
            self._sim_accumulator = 0.0
            return self.snapshot()

    def set_publish_rabbitmq(self, enabled: bool) -> dict[str, Any]:
        with self._lock:
            if enabled and self.patient_source != "existing":
                raise ValueError("RabbitMQ publish is only allowed for existing patient runs")
            if enabled:
                self._validate_existing_patient_for_publish()
            self.publish_rabbitmq = self._publish_allowed(bool(enabled))
            self.publisher.close(drain=False)
            self.publisher = RealtimeRabbitPublisher(enabled=self.publish_rabbitmq, env_path=self.env_path)
            return self.snapshot()

    def inject_abnormal(self, name: str, duration_seconds: int | None = None) -> dict[str, Any]:
        with self._lock:
            if name not in ABNORMAL_EVENT_TYPES:
                raise ValueError(f"Unsupported abnormal event: {name}")
            if duration_seconds is not None:
                duration_seconds = max(int(duration_seconds), MIN_ABNORMAL_DURATION_SECONDS.get(name, 1))
            if self._active_abnormal_events:
                self._clear_abnormal_locked(status="replaced")
            event = build_abnormal_event(
                name,
                self.current_second,
                duration_seconds,
                rng=random.Random(f"{self.run_id}:{name}:{self.current_second}"),
            )
            self._active_abnormal_events.append(event)
            ground_truth = self._ground_truth_payload(event, status="active")
            self._ground_truth_events.append(ground_truth)
            if self.patient_source == "existing":
                self._persist_ground_truth_async(ground_truth)
            if self.status == "running":
                self._tick_locked()
            return self.snapshot()

    def clear_abnormal(self) -> dict[str, Any]:
        with self._lock:
            self._clear_abnormal_locked(status="cleared")
            return self.snapshot()

    def tick_once(self) -> dict[str, Any]:
        """Advance one simulation second without starting the web background loop.

        This is used by the headless CLI runner so batch/streaming demos can use
        the same signal and payload logic as the frontend simulator without
        depending on FastAPI or browser state.
        """
        with self._lock:
            if self.status in {"stopped", "completed"}:
                return self.snapshot()
            if self.status == "created" and self.current_second == 0 and not self._records:
                self._realign_start_time(utc_now())
            self.status = "running"
            self._tick_locked()
            return self.snapshot()

    def run_for_ticks(self, ticks: int) -> dict[str, Any]:
        """Advance up to ``ticks`` simulation seconds synchronously."""
        snapshot: dict[str, Any] = {}
        for _ in range(max(0, int(ticks))):
            snapshot = self.tick_once()
            if snapshot.get("status") == "completed":
                break
        return snapshot or self.snapshot()

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            self._sync_ground_truth_status()
            return {
                "run_id": self.run_id,
                "status": self.status,
                "sim_time": format_utc_datetime(self.start_time + timedelta(seconds=self.current_second)),
                "current_second": self.current_second,
                "current_activity": self.current_activity,
                "speed": self.speed,
                "duration_seconds": self.duration_seconds,
                "publish_rabbitmq": self.publish_rabbitmq,
                "patient_source": self.patient_source,
                "publisher": self.publisher.stats(),
                "patient": self._patient_payload(),
                "baseline": self._baseline_payload(),
                "active_abnormal": self._active_abnormal_payload(),
                "samples": list(self._samples),
                "latest": self._latest_payload(),
                "raw_feed": list(self._raw_feed),
                "ground_truth": {
                    "active": self._active_abnormal_payload(),
                    "events": list(self._ground_truth_events),
                },
                "errors": list(self._errors),
            }

    def close(self) -> None:
        self._stop_event.set()
        self.publisher.close()

    def _loop(self) -> None:
        while not self._stop_event.is_set():
            ticks = 0
            with self._lock:
                if self.status == "running":
                    now = time.perf_counter()
                    elapsed = now - self._last_wall
                    self._last_wall = now
                    self._sim_accumulator += elapsed * self.speed
                    ticks = min(int(self._sim_accumulator), 60)
                    self._sim_accumulator -= ticks
            for _ in range(ticks):
                with self._lock:
                    if self.status != "running":
                        break
                    self._tick_locked()
            time.sleep(0.05)

    def _tick_locked(self) -> None:
        if self.duration_seconds is not None and self.current_second >= self.duration_seconds:
            self.status = "completed"
            self.publisher.close()
            return

        second = self.current_second
        timestamp = self.start_time + timedelta(seconds=second)
        if timestamp.date() != self._current_date:
            self._current_date = timestamp.date()
            self._cumulative_steps = 0
            self._step_accumulator = 0.0

        segment = self._segment()
        effects = _effects_for_segment(segment, self.profile)
        _maybe_start_noise_event(
            rng=self._rng,
            second=second,
            segment=segment,
            active_events=self._active_noise_events,
        )
        noise_fx = _active_noise_effects(second, self._active_noise_events)
        anomaly_fx, current_anomaly = active_abnormality_effects(second, self._active_abnormal_events)

        target_hr = (
            self._base_hr
            + float(effects["heart_rate_delta"])
            + noise_fx["heart_rate_delta"]
            + anomaly_fx["heart_rate_delta"]
        )
        target_rr = (
            self._base_rr
            + float(effects["respiratory_rate_delta"])
            + noise_fx["respiratory_rate_delta"]
            + anomaly_fx["respiratory_rate_delta"]
            + max(0.0, target_hr - self._base_hr) * 0.035
        )
        target_stress = (
            self._base_stress
            + float(effects["stress_delta"])
            + noise_fx["stress_delta"]
            + anomaly_fx["stress_delta"]
            + max(0.0, self._current_hr - self._base_hr) * 0.10
        )

        self._current_hr = _clamp(_smooth(self._current_hr, target_hr, 0.08, self._rng.gauss(0, 0.35)), 35, 190)
        self._current_rr = _clamp(_smooth(self._current_rr, target_rr, 0.05, self._rng.gauss(0, 0.08)), 8, 35)
        self._current_stress = _clamp(
            _smooth(self._current_stress, target_stress, 0.04, self._rng.gauss(0, 0.35)),
            0,
            99,
        )

        step_bounds = effects["steps_per_minute"]
        step_rate = (
            self._rng.uniform(float(step_bounds[0]), float(step_bounds[1]))
            * float(self.profile.wearable_baseline.daily_step_tendency)
            / 60.0
        )
        self._step_accumulator += step_rate
        steps_this_second = 0
        while self._step_accumulator >= 1.0:
            self._cumulative_steps += 1
            steps_this_second += 1
            self._step_accumulator -= 1.0

        self._hr_window.append(self._current_hr)
        self._rr_window.append(self._current_rr)
        windowed_hr = _mean(self._hr_window)
        windowed_rr = _mean(self._rr_window)

        ppi_std_ms = _clamp(
            self._base_ppi_std
            - max(0.0, windowed_hr - self._base_hr) * 0.18
            - max(0.0, self._current_stress - self._base_stress) * 0.05
            + self._rng.gauss(0, max(float(self.profile.wearable_baseline.ppg_noise_level) * 100, 0.8)),
            3,
            80,
        )
        if current_anomaly and current_anomaly.get("ppi_irregular"):
            ppi_std_ms = _clamp(ppi_std_ms * 3.0 + self._rng.uniform(20, 60), 3, 200)

        if current_anomaly and current_anomaly.get("motion_spike"):
            fall_elapsed = float(second - current_anomaly["start_second"])
            acc_mag, gyro_mag = _fall_motion_magnitudes(fall_elapsed, current_anomaly, self._rng)
        else:
            acc_mag, gyro_mag = _motion_magnitudes(segment, float(second), self._rng)

        record = {
            "second": second,
            "timestamp": timestamp,
            "heart_rate": windowed_hr,
            "respiratory_rate": windowed_rr,
            "stress_score": self._current_stress,
            "ppi_mean_ms": 60000.0 / max(windowed_hr, 1.0),
            "ppi_std_ms": ppi_std_ms,
            "steps_this_second": steps_this_second,
            "cumulative_steps": self._cumulative_steps,
            "acc_magnitude": acc_mag,
            "gyro_magnitude": gyro_mag,
            "segment": segment,
            "activity_type": segment["state"],
            "segment_kind": segment["kind"],
            "abnormality_event": current_anomaly["name"] if current_anomaly else None,
            "abnormality_start_second": current_anomaly["start_second"] if current_anomaly else None,
            "fall_event": current_anomaly if (current_anomaly and current_anomaly.get("motion_spike")) else None,
        }
        self._records.append(record)

        self._emit_continuous(record)
        self._emit_motion(record, current_anomaly)
        if (second + 1) % 15 == 0:
            self._emit_ppi_batch()
        if (second + 1) % 60 == 0:
            self._emit_steps_and_stress()
        if self._should_emit_bp(record):
            self._emit_bp(record, current_anomaly)
        if self._should_emit_spo2(record):
            self._emit_spo2(record, current_anomaly)
        self._append_sample(record)

        self.current_second += 1
        self._sync_ground_truth_status()
        if self.duration_seconds is not None and self.current_second >= self.duration_seconds:
            self.status = "completed"
            self.publisher.close()

    def _segment(self) -> dict[str, Any]:
        if self.current_activity == "sleep":
            return {"kind": "sleep", "state": "light"}
        return {"kind": "awake", "state": self.current_activity}

    def _emit_continuous(self, record: dict[str, Any]) -> None:
        self._counters["continuous"] += 1
        payload = {
            "message_id": f"msg_{self.profile.patient_id}_cont_{self._counters['continuous']:06d}",
            "patient_id": self.profile.patient_id,
            "device_id": f"SIM_WATCH_{self.profile.patient_id}",
            "timestamp": format_utc_datetime(record["timestamp"]),
            "heart_rate": int(round(record["heart_rate"])),
            "respiratory_rate": int(round(record["respiratory_rate"])),
            "stress_score": int(round(record["stress_score"])),
        }
        self._attach_context(payload, record)
        self._latest["continuous"] = payload
        self._emit("wearable_continuous", "wearable.continuous", payload)

    def _emit_motion(self, record: dict[str, Any], current_anomaly: dict[str, Any] | None) -> None:
        self._counters["motion"] += 1
        sampling_rate_hz = int(MOTION_BATCH.get("sampling_rate_hz", 10))
        rng = random.Random(self._motion_seed + record["second"] * 7)
        motion_points = []
        for sample_index in range(sampling_rate_hz):
            t_ms = int(sample_index * 1000 / sampling_rate_hz)
            t_global = float(record["second"]) + sample_index / sampling_rate_hz
            if current_anomaly and current_anomaly.get("motion_spike"):
                fall_elapsed = t_global - float(current_anomaly["start_second"])
                am, gm = _fall_motion_magnitudes(fall_elapsed, current_anomaly, rng)
            else:
                am, gm = _motion_magnitudes(record["segment"], t_global, rng)
            motion_points.append({"t_ms": t_ms, "acc_magnitude": am, "gyro_magnitude": gm})
        fall_spike = any(float(point["acc_magnitude"]) >= 2.5 for point in motion_points)
        if fall_spike:
            self._last_fall_spike_second = int(record["second"])
        window_end = record["timestamp"] + timedelta(milliseconds=int((sampling_rate_hz - 1) * 1000 / sampling_rate_hz))
        payload = {
            "message_id": f"msg_{self.profile.patient_id}_motion_{self._counters['motion']:06d}",
            "patient_id": self.profile.patient_id,
            "device_id": f"SIM_WATCH_{self.profile.patient_id}",
            "timestamp": format_utc_datetime(record["timestamp"]),
            "window_start": format_utc_datetime(record["timestamp"]),
            "window_end": format_utc_datetime(window_end),
            "motion_sampling_rate_hz": sampling_rate_hz,
            "motion_points": motion_points,
            "fall_spike": fall_spike,
        }
        self._attach_context(payload, record)
        self._latest["motion_batch"] = payload
        self._emit("wearable_motion_batch", "wearable.motion_batch", payload)

    def _build_ppi_intervals(self, window: list[dict[str, Any]], rng: random.Random) -> list[int]:
        return build_ppi_intervals_for_window(window, rng)

    def _emit_ppi_batch(self) -> None:
        window = list(self._records)[-15:]
        if len(window) < 15:
            return
        self._counters["ppi"] += 1
        intervals = self._build_ppi_intervals(window, self._ppi_rng)
        payload = {
            "message_id": f"msg_{self.profile.patient_id}_ppi_{self._counters['ppi']:06d}",
            "patient_id": self.profile.patient_id,
            "device_id": f"SIM_WATCH_{self.profile.patient_id}",
            "timestamp": format_utc_datetime(window[-1]["timestamp"]),
            "window_start": format_utc_datetime(window[0]["timestamp"]),
            "window_end": format_utc_datetime(window[-1]["timestamp"]),
            "interval_seconds": 15,
            "ppi_intervals_ms": intervals,
        }
        self._attach_context(payload, window[-1])
        self._latest["ppi_batch"] = payload
        self._emit("wearable_ppi_batch", "wearable.ppi_batch", payload)

    def _emit_steps_and_stress(self) -> None:
        window = list(self._records)[-60:]
        if len(window) < 60:
            return
        self._counters["steps"] += 1
        self._counters["stress"] += 1
        counts: dict[str, int] = {}
        for record in window:
            activity = record["activity_type"]
            counts[activity] = counts.get(activity, 0) + 1
        dominant_activity = max(counts, key=counts.get)
        steps_payload = {
            "message_id": f"msg_{self.profile.patient_id}_steps_{self._counters['steps']:06d}",
            "patient_id": self.profile.patient_id,
            "device_id": f"SIM_WATCH_{self.profile.patient_id}",
            "timestamp": format_utc_datetime(window[-1]["timestamp"]),
            "steps_count": sum(record["steps_this_second"] for record in window),
            "steps_rate_per_min": sum(record["steps_this_second"] for record in window),
            "activity_type": dominant_activity,
            "interval_seconds": 60,
        }
        self._attach_context(steps_payload, window[-1])
        stress_score = int(round(sum(record["stress_score"] for record in window) / len(window)))
        stress_payload = {
            "message_id": f"msg_{self.profile.patient_id}_stress_{self._counters['stress']:06d}",
            "patient_id": self.profile.patient_id,
            "device_id": f"SIM_WATCH_{self.profile.patient_id}",
            "timestamp": format_utc_datetime(window[-1]["timestamp"]),
            "stress_score": stress_score,
            "stress_level": _stress_level(stress_score),
            "interval_seconds": 60,
        }
        self._attach_context(stress_payload, window[-1])
        self._latest["steps_event"] = steps_payload
        self._latest["stress"] = stress_payload
        self._emit("wearable_steps_event", "wearable.steps_event", steps_payload)
        self._emit("wearable_stress", "wearable.stress", stress_payload)

    def _emit_bp(self, record: dict[str, Any], current_anomaly: dict[str, Any] | None) -> None:
        self._counters["bp"] += 1
        systolic = float(self.profile.baseline.systolic_bp)
        diastolic = float(self.profile.baseline.diastolic_bp)
        event_name = current_anomaly.get("name") if current_anomaly else None
        if event_name and event_name in ABNORM_BP_EFFECTS:
            bp_fx = ABNORM_BP_EFFECTS[event_name]
            systolic += self._rng.uniform(*bp_fx["systolic"])
            diastolic += self._rng.uniform(*bp_fx["diastolic"])
        systolic = int(round(_clamp(systolic + self._rng.gauss(0, 3), 80, 220)))
        diastolic = int(round(_clamp(diastolic + self._rng.gauss(0, 2), 45, 140)))
        if systolic <= diastolic + 15:
            systolic = diastolic + 16
        payload = {
            "message_id": f"msg_{self.profile.patient_id}_bp_{self._counters['bp']:06d}",
            "event_type": "wearable.bp_triggered",
            "trigger_type": "blood_pressure",
            "patient_id": self.profile.patient_id,
            "device_id": f"SIM_WATCH_{self.profile.patient_id}",
            "timestamp": format_utc_datetime(record["timestamp"]),
            "systolic_bp": systolic,
            "diastolic_bp": diastolic,
        }
        self._attach_context(payload, record)
        self._latest_bp = {"systolic_bp": systolic, "diastolic_bp": diastolic}
        self._latest["bp_triggered"] = payload
        self._emit("wearable_bp_triggered", "wearable.bp_triggered", payload)

    def _emit_spo2(self, record: dict[str, Any], current_anomaly: dict[str, Any] | None) -> None:
        self._counters["spo2"] += 1
        spo2_base = float(self.profile.wearable_baseline.spo2)
        event_name = current_anomaly.get("name") if current_anomaly else None
        if event_name and event_name in ABNORM_SPO2_EFFECTS:
            spo2_base += self._rng.uniform(*ABNORM_SPO2_EFFECTS[event_name])
        spo2 = int(round(_clamp(spo2_base + self._rng.gauss(0, 0.35), 85, 100)))
        payload = {
            "message_id": f"msg_{self.profile.patient_id}_spo2_{self._counters['spo2']:06d}",
            "event_type": "wearable.spo2_triggered",
            "trigger_type": "spo2",
            "patient_id": self.profile.patient_id,
            "device_id": f"SIM_WATCH_{self.profile.patient_id}",
            "timestamp": format_utc_datetime(record["timestamp"]),
            "spo2": spo2,
        }
        self._attach_context(payload, record)
        self._latest_spo2 = spo2
        self._latest["spo2_triggered"] = payload
        self._emit("wearable_spo2_triggered", "wearable.spo2_triggered", payload)

    def _attach_context(self, payload: dict[str, Any], record: dict[str, Any]) -> None:
        timestamp = payload.get("timestamp") or payload.get("window_end")
        trace_id = payload.get("message_id")
        context: dict[str, Any] = {
            "run_id": self.run_id,
            "trace_id": trace_id,
            "source_event_time": timestamp,
            "sim_second": record.get("second"),
            "activity_type": record.get("activity_type"),
        }
        event_name = record.get("abnormality_event")
        if event_name:
            context["abnormal_event_type"] = event_name
            context["abnormal_event_time"] = timestamp
        payload["context"] = context

    def _emit(self, stream_name: str, routing_key: str, payload: dict[str, Any]) -> None:
        published = False
        error = None
        if self.publish_rabbitmq:
            try:
                queue = self.publisher.publish(stream_name, payload)
                routing_key = str(queue.get("routing_key", routing_key)) if queue else routing_key
                published = True
            except Exception as exc:
                error = f"{type(exc).__name__}: {exc}"
                self._errors.append({
                    "timestamp": format_utc_datetime(utc_now()),
                    "stream": stream_name,
                    "error": error,
                })
                self.publish_rabbitmq = False
                self.publisher.enabled = False
        self._raw_feed.appendleft({
            "stream": routing_key,
            "stream_name": stream_name,
            "timestamp": payload.get("timestamp") or payload.get("window_end"),
            "message_id": payload.get("message_id"),
            "published": published,
            "error": error,
            "payload": payload,
        })

    def _append_sample(self, record: dict[str, Any]) -> None:
        self._samples.append({
            "patientId": self.profile.patient_id,
            "timestamp": format_utc_datetime(record["timestamp"]),
            "vitals": {
                "heartRate": int(round(record["heart_rate"])),
                "respiratoryRate": int(round(record["respiratory_rate"])),
                "spo2": self._latest_spo2,
                "systolicBp": self._latest_bp["systolic_bp"],
                "diastolicBp": self._latest_bp["diastolic_bp"],
            },
        })

    def _should_emit_bp(self, record: dict[str, Any]) -> bool:
        event_name = record.get("abnormality_event")
        if record["second"] == 0 or record["second"] % (30 * 60) == 0:
            return True
        if event_name in ABNORM_BP_EFFECTS:
            return record["second"] % 5 == 0 or record["second"] == record.get("abnormality_start_second")
        return False

    def _should_emit_spo2(self, record: dict[str, Any]) -> bool:
        event_name = record.get("abnormality_event")
        if record["second"] == 0 or record["second"] % (30 * 60) == 0:
            return True
        if event_name in ABNORM_SPO2_EFFECTS:
            return True
        return False

    def _ground_truth_payload(self, event: dict[str, Any], *, status: str) -> dict[str, Any]:
        start_second = int(event["start_second"])
        end_second = int(event["end_second"])
        start_time = self.start_time + timedelta(seconds=start_second)
        end_time = self.start_time + timedelta(seconds=end_second)
        episode_type = str(event["name"])
        return {
            "event_id": f"gt_{self.run_id}_{len(self._ground_truth_events) + 1:04d}",
            "patient_id": self.profile.patient_id,
            "episode_type": episode_type,
            "start_time": format_utc_datetime(start_time),
            "end_time": format_utc_datetime(end_time),
            "duration_seconds": max(0, end_second - start_second),
            "duration_minutes": round(max(0, end_second - start_second) / 60, 1),
            "severity": EPISODE_SEVERITY.get(episode_type, "warning"),
            "status": status,
            "expected_alert_type": self._expected_alert_type(episode_type),
        }

    def _persist_ground_truth_async(self, ground_truth: dict[str, Any]) -> None:
        threading.Thread(
            target=self._persist_ground_truth,
            args=(dict(ground_truth),),
            name=f"simulator-ground-truth-{self.run_id[:8]}",
            daemon=True,
        ).start()

    def _persist_ground_truth(self, ground_truth: dict[str, Any]) -> None:
        if self.patient_source != "existing":
            return
        conn = None
        try:
            import psycopg2
            from database.config import load_database_config

            patient_id = self.profile.patient_id
            device_id = f"SIM_WATCH_{patient_id}"
            config = load_database_config()
            conn = psycopg2.connect(config.require_supabase_db_url(), connect_timeout=5)
            with conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT 1 FROM public.patients WHERE patient_id = %s LIMIT 1",
                        (patient_id,),
                    )
                    if cur.fetchone() is None:
                        raise ValueError(f"Existing patient not found in Supabase: {patient_id}")

                    cur.execute(
                        """
                        INSERT INTO public.devices (
                          device_id, patient_id, device_type, vendor, model,
                          external_device_key, status
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (device_id) DO UPDATE SET
                          patient_id = EXCLUDED.patient_id,
                          device_type = EXCLUDED.device_type,
                          vendor = EXCLUDED.vendor,
                          model = EXCLUDED.model,
                          external_device_key = EXCLUDED.external_device_key,
                          status = EXCLUDED.status
                        """,
                        (
                            device_id,
                            patient_id,
                            "simulator_watch",
                            "Team1 Simulator",
                            "RealtimeWearable",
                            device_id,
                            "active",
                        ),
                    )

                    start_time = datetime.fromisoformat(str(ground_truth["start_time"]).replace("Z", "+00:00"))
                    end_time = datetime.fromisoformat(str(ground_truth["end_time"]).replace("Z", "+00:00"))
                    cur.execute(
                        """
                        INSERT INTO public.scenario_ground_truth (
                          episode_id, patient_id, device_id, episode_type,
                          start_time, end_time, duration_seconds, duration_minutes,
                          severity, status
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (episode_id) DO UPDATE SET
                          patient_id = EXCLUDED.patient_id,
                          device_id = EXCLUDED.device_id,
                          episode_type = EXCLUDED.episode_type,
                          start_time = EXCLUDED.start_time,
                          end_time = EXCLUDED.end_time,
                          duration_seconds = EXCLUDED.duration_seconds,
                          duration_minutes = EXCLUDED.duration_minutes,
                          severity = EXCLUDED.severity,
                          status = EXCLUDED.status
                        """,
                        (
                            str(ground_truth["event_id"]),
                            patient_id,
                            device_id,
                            str(ground_truth["episode_type"]),
                            start_time,
                            end_time,
                            int(ground_truth["duration_seconds"]),
                            float(ground_truth["duration_minutes"]),
                            ground_truth.get("severity"),
                            "abnormal",
                        ),
                    )
            observability_writer.record_step(
                self.run_id,
                step="ground_truth_persisted",
                status="ok",
                message=f"{ground_truth['episode_type']} saved to Supabase scenario_ground_truth",
                metadata={"episode_id": ground_truth["event_id"], "patient_id": patient_id},
            )
        except Exception as exc:
            error = f"{type(exc).__name__}: {exc}"
            self._errors.append({
                "timestamp": format_utc_datetime(utc_now()),
                "stream": "scenario_ground_truth",
                "error": error,
            })
            observability_writer.record_step(
                self.run_id,
                step="ground_truth_persisted",
                status="error",
                message=error,
                metadata={"episode_id": ground_truth.get("event_id"), "patient_id": self.profile.patient_id},
            )
        finally:
            if conn is not None and not conn.closed:
                conn.close()

    def _clear_abnormal_locked(self, *, status: str) -> None:
        now_second = self.current_second
        for event in self._ground_truth_events:
            if event.get("status") == "active":
                event["status"] = status
                event["end_time"] = format_utc_datetime(self.start_time + timedelta(seconds=now_second))
                start_dt = datetime.fromisoformat(str(event["start_time"]).replace("Z", "+00:00"))
                duration = max(0, int((self.start_time + timedelta(seconds=now_second) - start_dt).total_seconds()))
                event["duration_seconds"] = duration
                event["duration_minutes"] = round(duration / 60, 1)
        self._active_abnormal_events.clear()

    def _sync_ground_truth_status(self) -> None:
        now_dt = self.start_time + timedelta(seconds=self.current_second)
        for event in self._ground_truth_events:
            if event.get("status") != "active":
                continue
            end_dt = datetime.fromisoformat(str(event["end_time"]).replace("Z", "+00:00"))
            if now_dt >= end_dt:
                event["status"] = "completed"

    def _active_abnormal_payload(self) -> dict[str, Any] | None:
        if not self._active_abnormal_events:
            return None
        event = self._active_abnormal_events[0]
        remaining = max(0, int(event["end_second"]) - self.current_second)
        return {
            "episode_type": event["name"],
            "start_second": event["start_second"],
            "end_second": event["end_second"],
            "remaining_seconds": remaining,
            "severity": EPISODE_SEVERITY.get(str(event["name"]), "warning"),
        }

    def _latest_payload(self) -> dict[str, Any]:
        ppi = self._latest["ppi_batch"]
        motion = self._latest["motion_batch"]
        ppi_intervals = list(ppi.get("ppi_intervals_ms", [])) if ppi else []
        motion_points = motion.get("motion_points", []) if motion else []
        acc_values = [point.get("acc_magnitude", 0) for point in motion_points]
        gyro_values = [point.get("gyro_magnitude", 0) for point in motion_points]
        mean_ppi = sum(ppi_intervals) / len(ppi_intervals) if ppi_intervals else None
        preview_window = list(self._records)[-15:]
        preview_intervals = self._build_ppi_intervals(
            preview_window,
            random.Random(f"{self.run_id}:ppi-preview:{preview_window[0]['second'] if preview_window else 0}:{self.current_second}"),
        ) if preview_window else []
        preview_mean_ppi = sum(preview_intervals) / len(preview_intervals) if preview_intervals else None
        next_patch_in_seconds = 15 - (self.current_second % 15)
        recent_fall_spike = (
            self._last_fall_spike_second is not None
            and self.current_second - self._last_fall_spike_second <= 10
        )
        return {
            **self._latest,
            "panels": {
                "ppi": {
                    "ppi_intervals_ms": ppi_intervals,
                    "rmssd": compute_rmssd(ppi_intervals),
                    "mean_ms": round(mean_ppi, 2) if mean_ppi is not None else None,
                    "irregularity": compute_irregularity(ppi_intervals),
                    "preview_intervals_ms": preview_intervals,
                    "preview_rmssd": compute_rmssd(preview_intervals),
                    "preview_mean_ms": round(preview_mean_ppi, 2) if preview_mean_ppi is not None else None,
                    "preview_irregularity": compute_irregularity(preview_intervals),
                    "next_patch_in_seconds": next_patch_in_seconds,
                    "window_seconds": 15,
                },
                "motion": {
                    "acc_magnitude_max": max(acc_values) if acc_values else None,
                    "gyro_magnitude_max": max(gyro_values) if gyro_values else None,
                    "fall_spike": recent_fall_spike or (max(acc_values) >= 2.5 if acc_values else False),
                },
                "activity": {
                    "activity_type": self.current_activity,
                    "steps_today": self._cumulative_steps,
                    "stress_score": int(round(self._current_stress)),
                    "stress_level": _stress_level(self._current_stress),
                },
            },
        }

    @staticmethod
    def _normalize_patient_source(value: str) -> str:
        normalized = (value or "sandbox").strip().lower()
        if normalized not in {"sandbox", "existing"}:
            raise ValueError(f"Unsupported patient_source: {value}")
        return normalized

    def _publish_allowed(self, enabled: bool) -> bool:
        return bool(enabled and self.patient_source == "existing")

    def _validate_existing_patient_for_publish(self) -> None:
        if not self.validate_existing_patient:
            return
        if self.patient_source != "existing":
            raise ValueError("RabbitMQ publish is only allowed for existing patient runs")
        conn = None
        try:
            import psycopg2
            from database.config import load_database_config

            config = load_database_config()
            conn = psycopg2.connect(config.require_supabase_db_url(), connect_timeout=5)
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM public.patients WHERE patient_id = %s LIMIT 1",
                    (self.profile.patient_id,),
                )
                exists = cur.fetchone() is not None
            if not exists:
                raise ValueError(f"Existing patient not found in Supabase: {self.profile.patient_id}")
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Cannot validate existing patient before publish: {type(exc).__name__}: {exc}") from exc
        finally:
            if conn is not None and not conn.closed:
                conn.close()

    def _patient_payload(self) -> dict[str, Any]:
        return {
            "patient_id": self.profile.patient_id,
            "patient_source": self.patient_source,
            "name": self.profile.name,
            "age": self.profile.age,
            "gender": self.profile.gender,
            "lifestyle": self.profile.lifestyle,
            "health_status": self.profile.health_status,
            "risk_factors": self.profile.risk_factors,
        }

    def _baseline_payload(self) -> dict[str, Any]:
        baseline = self.profile.baseline
        wearable = self.profile.wearable_baseline
        return {
            "heart_rate": round(wearable.resting_heart_rate, 1),
            "respiratory_rate": round(wearable.respiratory_rate, 1),
            "systolic_bp": round(baseline.systolic_bp, 1),
            "diastolic_bp": round(baseline.diastolic_bp, 1),
            "spo2": round(wearable.spo2, 1),
            "ppi_resting_mean_ms": round(wearable.ppi_resting_mean_ms, 1),
            "ppi_resting_std_ms": round(wearable.ppi_resting_std_ms, 1),
            "hrv_rmssd_morning": round(wearable.hrv_rmssd_morning, 1),
        }

    @staticmethod
    def _expected_alert_type(episode_type: str) -> str:
        mapping = {
            "tachycardia": "high_heart_rate",
            "bradycardia": "low_heart_rate",
            "hypertension_episode": "high_blood_pressure",
            "spo2_drop": "low_spo2",
            "fall_event": "fall_detected",
            "afib_episode": "stroke_risk",
            "stress_episode": "stress_episode",
        }
        return mapping.get(episode_type, episode_type)

    @staticmethod
    def _normalize_activity(activity: str) -> str:
        if activity not in ACTIVITY_STATES:
            raise ValueError(f"Unsupported activity: {activity}")
        return activity

    @staticmethod
    def _normalize_speed(speed: int) -> int:
        if int(speed) not in SPEEDS:
            raise ValueError(f"Unsupported speed: {speed}")
        return int(speed)


class SimulationManager:
    def __init__(self, *, env_path: Path | None = None) -> None:
        self.env_path = env_path
        self._runs: dict[str, RealtimeSimulationRun] = {}
        self._lock = threading.RLock()

    def create_run(self, config: RealtimeRunConfig, *, stop_existing_runs: bool = True) -> dict[str, Any]:
        with self._lock:
            if stop_existing_runs:
                self._stop_all_locked()
            run_id = uuid4().hex
            run = RealtimeSimulationRun(run_id=run_id, config=config, env_path=self.env_path)
            self._runs[run_id] = run
            threading.Thread(
                target=self._record_observability_run,
                args=(run_id, run, config),
                name=f"simulator-observability-{run_id[:8]}",
                daemon=True,
            ).start()
            return run.snapshot()

    @staticmethod
    def _record_observability_run(run_id: str, run: RealtimeSimulationRun, config: RealtimeRunConfig) -> None:
        observability_writer.create_run(
            run_id,
            profile="frontend_realtime_simulator",
            config={
                "patient_id": run.profile.patient_id,
                "age": config.age,
                "gender": config.gender,
                "lifestyle": config.lifestyle,
                "health_status": config.health_status,
                "risk_factors": config.risk_factors,
                "activity": config.activity,
                "speed": config.speed,
                "duration_seconds": config.duration_seconds,
                "publish_rabbitmq": run.publish_rabbitmq,
                "patient_source": run.patient_source,
            },
            notes="Created from frontend /metrics realtime simulator.",
        )

    def get(self, run_id: str) -> RealtimeSimulationRun:
        with self._lock:
            if run_id not in self._runs:
                raise KeyError(run_id)
            return self._runs[run_id]

    def stop_all(self) -> dict[str, Any]:
        with self._lock:
            return self._stop_all_locked()

    def _stop_all_locked(self) -> dict[str, Any]:
        stopped = 0
        for run in self._runs.values():
            if run.status in {"running", "paused", "created", "completed", "stopped"}:
                run.stop()
                stopped += 1
        return {"stopped": stopped, "runs": self.list_runs()}

    def list_runs(self) -> list[dict[str, Any]]:
        with self._lock:
            return [
                {
                    "run_id": run.run_id,
                    "patient_id": run.profile.patient_id,
                    "status": run.status,
                    "current_second": run.current_second,
                    "publish_rabbitmq": run.publish_rabbitmq,
                    "patient_source": run.patient_source,
                    "publisher": run.publisher.stats(),
                }
                for run in self._runs.values()
            ]

    def close(self) -> None:
        with self._lock:
            for run in self._runs.values():
                run.stop()
