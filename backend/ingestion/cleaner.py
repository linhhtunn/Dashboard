"""Validate and classify raw broker payloads."""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, replace
from enum import StrEnum
from typing import Any

from pydantic import ValidationError

from contracts.sensor_data import ParsedQueueMessage, SensorData, parse_queue_payload
from settings import ValidationSettings


class DataState(StrEnum):
    VALID = "VALID"
    INVALID = "INVALID"
    DUPLICATE = "DUPLICATE"
    FAULT = "FAULT"
    SENSOR_FAULT = "SENSOR_FAULT"


@dataclass(frozen=True)
class CleanVitalRecord:
    message_id: str
    patient_id: str
    timestamp: Any
    data_state: DataState
    # Wearable v2 fields (these map to `clean_vitals` columns on Supabase)
    scenario_id: str | None = None
    steps: int | None = None
    distance_km: float | None = None
    heart_rate: float | None = None
    # Legacy fields kept for backward-compatible tests/fixtures (not inserted into DB by default)
    rr_interval_ms: float | None = None
    respiratory_rate: float | None = None
    spo2: float | None = None
    temperature_c: float | None = None
    hrv_rmssd: float | None = None
    stress_score: int | None = None
    acc_magnitude: float | None = None
    ecg_status: str | None = None
    ecg_heart_rhythm: str | None = None
    sleep_stage: str | None = None
    sleep_quality: str | None = None
    validation_notes: str | None = None


def _magnitude(x: float, y: float, z: float) -> float:
    return math.sqrt((x * x) + (y * y) + (z * z))


def _near_zero(value: float, tol: float) -> bool:
    return abs(value) <= tol


class VitalCleaner:
    def __init__(self, settings: ValidationSettings | None = None) -> None:
        self._settings = settings or ValidationSettings()

    def clean_payload(
        self,
        payload: bytes | str | dict[str, Any],
        *,
        is_duplicate: bool = False,
    ) -> tuple[ParsedQueueMessage | None, CleanVitalRecord]:
        raw_dict = self._to_dict(payload)

        if is_duplicate:
            parsed = self._safe_parse(raw_dict)
            return parsed, self._duplicate_record(parsed, raw_dict)

        try:
            parsed = parse_queue_payload(raw_dict)
        except ValidationError as exc:
            return None, self._invalid_record(raw_dict, f"schema:{exc.errors()[0]['type']}")
        except ValueError as exc:
            return None, self._invalid_record(raw_dict, f"schema:{exc}")

        state, notes = self._classify(parsed.sensor)
        record = self._build_record(parsed, state, notes)
        return parsed, record

    def _to_dict(self, payload: bytes | str | dict[str, Any]) -> dict[str, Any]:
        if isinstance(payload, dict):
            return payload
        if isinstance(payload, bytes):
            payload = payload.decode("utf-8")
        return json.loads(payload)

    def _safe_parse(self, raw_dict: dict[str, Any]) -> ParsedQueueMessage | None:
        try:
            return parse_queue_payload(raw_dict)
        except ValidationError:
            return None

    def _classify(self, sensor: SensorData) -> tuple[DataState, str | None]:
        signals = sensor.flat_signals()
        notes: list[str] = []
        tol = self._settings.zero_signal_abs_tol

        heart_rate = signals["heart_rate"]
        spo2 = signals.get("spo2")
        if heart_rate is not None and spo2 is not None:
            if _near_zero(float(heart_rate), tol) and float(spo2) >= self._settings.heart_rate_spo2_fault_threshold:
                return DataState.SENSOR_FAULT, "heart_rate_zero_with_normal_spo2"

        for field_name, value in signals.items():
            if value is None:
                continue
            numeric_range = self._settings.signal_ranges.get(field_name)
            if numeric_range is None:
                continue
            if not numeric_range.contains(float(value)):
                notes.append(f"out_of_range:{field_name}")
                return DataState.INVALID, ",".join(notes)

        return DataState.VALID, None

    def _build_record(
        self,
        parsed: ParsedQueueMessage,
        state: DataState,
        notes: str | None,
    ) -> CleanVitalRecord:
        row = parsed.sensor.to_clean_vitals_row()
        # We support multiple simulator/broker shapes over time; only populate fields
        # that exist in the current `CleanVitalRecord` + DB schema.
        return CleanVitalRecord(
            message_id=parsed.message_id,
            patient_id=row["patient_id"],
            timestamp=row["timestamp"],
            data_state=state,
            scenario_id=parsed.scenario_id,
            steps=row.get("steps"),
            distance_km=row.get("distance_km"),
            heart_rate=row.get("heart_rate"),
            rr_interval_ms=row.get("rr_interval_ms"),
            respiratory_rate=row.get("respiratory_rate"),
            spo2=row.get("spo2"),
            temperature_c=row.get("temperature_c"),
            hrv_rmssd=row.get("hrv_rmssd"),
            stress_score=row.get("stress_score"),
            acc_magnitude=row.get("acc_magnitude"),
            ecg_status=row.get("ecg_status"),
            ecg_heart_rhythm=row.get("ecg_heart_rhythm"),
            sleep_stage=row.get("sleep_stage"),
            sleep_quality=row.get("sleep_quality"),
            validation_notes=notes,
        )

    def _invalid_record(self, raw_dict: dict[str, Any], note: str) -> CleanVitalRecord:
        return CleanVitalRecord(
            message_id=str(raw_dict.get("message_id", "unknown")),
            patient_id=str(raw_dict.get("patient_id", "unknown")),
            timestamp=raw_dict.get("timestamp"),
            data_state=DataState.INVALID,
            validation_notes=note,
        )

    def _duplicate_record(
        self,
        parsed: ParsedQueueMessage | None,
        raw_dict: dict[str, Any],
    ) -> CleanVitalRecord:
        if parsed is None:
            return CleanVitalRecord(
                message_id=str(raw_dict.get("message_id", "unknown")),
                patient_id=str(raw_dict.get("patient_id", "unknown")),
                timestamp=raw_dict.get("timestamp"),
                data_state=DataState.DUPLICATE,
                validation_notes="duplicate_message_id",
            )
        record = self._build_record(parsed, DataState.DUPLICATE, "duplicate_message_id")
        return replace(record, data_state=DataState.DUPLICATE, validation_notes="duplicate_message_id")
