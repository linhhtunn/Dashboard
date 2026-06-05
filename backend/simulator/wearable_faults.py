from __future__ import annotations

import copy
import random
from datetime import timedelta
from typing import Any, Iterable

from simulator.models import format_utc_datetime, parse_utc_datetime


def _weighted_fault_choice(rng: random.Random, probabilities: dict[str, float]) -> str | None:
    total = sum(max(float(probability), 0.0) for probability in probabilities.values())
    if total <= 0 or rng.random() >= total:
        return None

    pick = rng.uniform(0, total)
    cumulative = 0.0
    for fault_type, probability in probabilities.items():
        cumulative += max(float(probability), 0.0)
        if pick <= cumulative:
            return fault_type
    return None


def _weighted_fault_name(rng: random.Random, probabilities: dict[str, float]) -> str:
    total = sum(max(float(probability), 0.0) for probability in probabilities.values())
    if total <= 0:
        return next(iter(probabilities))

    pick = rng.uniform(0, total)
    cumulative = 0.0
    for fault_type, probability in probabilities.items():
        cumulative += max(float(probability), 0.0)
        if pick <= cumulative:
            return fault_type
    return next(reversed(probabilities))


def _fault_log_entry(stream_name: str, message: dict[str, Any], fault_type: str, detail: str) -> dict[str, Any]:
    return {
        "stream": stream_name,
        "fault_type": fault_type,
        "source_message_id": message.get("message_id"),
        "patient_id": message.get("patient_id"),
        "timestamp": message.get("timestamp"),
        "detail": detail,
    }


def _missing_field_name(stream_name: str, rng: random.Random) -> str:
    if stream_name == "wearable_continuous":
        return rng.choice(["steps", "heart_rate", "respiratory_rate", "stress_score"])
    if stream_name == "wearable_spo2_triggered":
        return "spo2"
    if stream_name == "wearable_ecg_triggered":
        return "ecg_points"
    return "timestamp"


def _apply_fault(
    *,
    stream_name: str,
    message: dict[str, Any],
    fault_type: str,
    rng: random.Random,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    faulty = copy.deepcopy(message)

    if fault_type == "missing_record":
        return [], _fault_log_entry(stream_name, message, fault_type, "Dropped the whole record.")

    if fault_type == "missing_timestamp":
        faulty.pop("timestamp", None)
        return [faulty], _fault_log_entry(stream_name, message, fault_type, "Removed top-level timestamp.")

    if fault_type == "missing_patient_id":
        faulty.pop("patient_id", None)
        return [faulty], _fault_log_entry(stream_name, message, fault_type, "Removed top-level patient_id.")

    if fault_type == "missing_field":
        field_name = _missing_field_name(stream_name, rng)
        faulty.pop(field_name, None)
        return [faulty], _fault_log_entry(stream_name, message, fault_type, f"Removed top-level {field_name}.")

    if fault_type == "invalid_heart_rate":
        faulty["heart_rate"] = -20
        return [faulty], _fault_log_entry(stream_name, message, fault_type, "Set heart_rate to -20.")

    if fault_type == "invalid_respiratory_rate":
        faulty["respiratory_rate"] = 80
        return [faulty], _fault_log_entry(stream_name, message, fault_type, "Set respiratory_rate to 80.")

    if fault_type == "invalid_stress_score":
        faulty["stress_score"] = 140
        return [faulty], _fault_log_entry(stream_name, message, fault_type, "Set stress_score to 140.")

    if fault_type == "invalid_spo2":
        faulty["spo2"] = 140
        return [faulty], _fault_log_entry(stream_name, message, fault_type, "Set spo2 to 140.")

    if fault_type == "missing_ecg_points":
        faulty.pop("ecg_points", None)
        return [faulty], _fault_log_entry(stream_name, message, fault_type, "Removed top-level ecg_points.")

    if fault_type == "out_of_order_timestamp":
        timestamp = parse_utc_datetime(faulty["timestamp"]) - timedelta(seconds=30)
        faulty["timestamp"] = format_utc_datetime(timestamp)
        return [faulty], _fault_log_entry(stream_name, message, fault_type, "Moved timestamp 30 seconds backwards.")

    if fault_type == "duplicate_message":
        duplicate = copy.deepcopy(message)
        return [message, duplicate], _fault_log_entry(stream_name, message, fault_type, "Emitted the same record twice.")

    raise ValueError(f"Unknown wearable fault_type={fault_type!r}")


def inject_wearable_faults(
    *,
    records: Iterable[dict[str, Any]],
    stream_name: str,
    config: dict[str, Any],
    seed: int,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if not config.get("enabled", False):
        return list(records), []

    source_records = list(records)
    probabilities = dict(config.get("probabilities_by_stream", {}).get(stream_name, {}))
    if not probabilities:
        return source_records, []

    rng = random.Random(seed)
    output: list[dict[str, Any]] = []
    fault_log: list[dict[str, Any]] = []
    max_faults = config.get("max_faults_per_stream")
    min_faults = int(config.get("min_faults_by_stream", {}).get(stream_name, 0))
    forced_count = min(min_faults, len(source_records))
    forced_indices = set(rng.sample(range(len(source_records)), forced_count)) if forced_count > 0 else set()

    for index, record in enumerate(source_records):
        if max_faults is not None and len(fault_log) >= int(max_faults):
            output.append(record)
            continue

        fault_type = _weighted_fault_choice(rng, probabilities)
        if fault_type is None:
            if index not in forced_indices or len(fault_log) >= min_faults:
                output.append(record)
                continue
            fault_type = _weighted_fault_name(rng, probabilities)

        emitted_records, log_entry = _apply_fault(
            stream_name=stream_name,
            message=record,
            fault_type=fault_type,
            rng=rng,
        )
        output.extend(emitted_records)
        fault_log.append(log_entry)

    return output, fault_log

