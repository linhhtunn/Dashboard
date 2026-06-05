from __future__ import annotations

import copy
import random
from datetime import timedelta
from typing import Any, Iterable

from backend.simulator.models import format_utc_datetime, parse_utc_datetime


def _weighted_fault_choice(rng: random.Random, probabilities: dict[str, float]) -> str | None:
    total = sum(max(probability, 0.0) for probability in probabilities.values())
    if total <= 0 or rng.random() >= total:
        return None

    pick = rng.uniform(0, total)
    cumulative = 0.0
    for fault_type, probability in probabilities.items():
        cumulative += max(probability, 0.0)
        if pick <= cumulative:
            return fault_type
    return None


def _fault_log_entry(message: dict, fault_type: str, detail: str) -> dict:
    return {
        "fault_type": fault_type,
        "source_message_id": message.get("message_id"),
        "patient_id": message.get("patient_id"),
        "timestamp": message.get("timestamp"),
        "detail": detail,
    }


def _apply_fault(message: dict, fault_type: str) -> tuple[list[dict], dict]:
    faulty = copy.deepcopy(message)

    if fault_type == "missing_timestamp":
        faulty.pop("timestamp", None)
        return [faulty], _fault_log_entry(message, fault_type, "Removed top-level timestamp.")

    if fault_type == "missing_patient_id":
        faulty.pop("patient_id", None)
        return [faulty], _fault_log_entry(message, fault_type, "Removed top-level patient_id.")

    if fault_type == "invalid_heart_rate":
        faulty["signals"]["heart_rate"] = -20
        return [faulty], _fault_log_entry(message, fault_type, "Set signals.heart_rate to -20.")

    if fault_type == "invalid_spo2":
        faulty["signals"]["spo2"] = 140
        return [faulty], _fault_log_entry(message, fault_type, "Set signals.spo2 to 140.")

    if fault_type == "missing_signal":
        faulty["signals"].pop("heart_rate", None)
        return [faulty], _fault_log_entry(message, fault_type, "Removed signals.heart_rate.")

    if fault_type == "out_of_order_timestamp":
        timestamp = parse_utc_datetime(faulty["timestamp"]) - timedelta(seconds=30)
        faulty["timestamp"] = format_utc_datetime(timestamp)
        return [faulty], _fault_log_entry(message, fault_type, "Moved timestamp 30 seconds backwards.")

    if fault_type == "duplicate_message":
        duplicate = copy.deepcopy(message)
        return [message, duplicate], _fault_log_entry(message, fault_type, "Emitted the same message twice.")

    raise ValueError(f"Unknown fault_type={fault_type!r}")


def inject_faults(
    messages: Iterable[dict],
    config: Any,
    seed: int,
) -> tuple[list[dict], list[dict]]:
    if not config.enabled:
        return list(messages), []

    rng = random.Random(seed)
    output: list[dict] = []
    fault_log: list[dict] = []
    max_faults = config.max_faults

    for message in messages:
        if max_faults is not None and len(fault_log) >= max_faults:
            output.append(message)
            continue

        fault_type = _weighted_fault_choice(rng, config.probabilities)
        if fault_type is None:
            output.append(message)
            continue

        emitted_messages, log_entry = _apply_fault(message, fault_type)
        output.extend(emitted_messages)
        fault_log.append(log_entry)

    return output, fault_log
