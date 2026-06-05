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
    heart_rate: float | None = None
    rr_interval_ms: float | None = None
    hrv_rmssd: float | None = None
    systolic_bp: float | None = None
    diastolic_bp: float | None = None
    spo2: float | None = None
    acc_x: float | None = None
    acc_y: float | None = None
    acc_z: float | None = None
    acc_magnitude: float | None = None
    gyro_x: float | None = None
    gyro_y: float | None = None
    gyro_z: float | None = None
    gyro_magnitude: float | None = None
    scenario_id: str | None = None
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
        spo2 = signals["spo2"]
        if heart_rate is not None and spo2 is not None:
            if _near_zero(heart_rate, tol) and spo2 >= self._settings.heart_rate_spo2_fault_threshold:
                return DataState.SENSOR_FAULT, "heart_rate_zero_with_normal_spo2"

        acc_x, acc_y, acc_z = signals["acc_x"], signals["acc_y"], signals["acc_z"]
        gyro_x, gyro_y, gyro_z = signals["gyro_x"], signals["gyro_y"], signals["gyro_z"]
        if acc_x is not None and acc_y is not None and acc_z is not None:
            acc_flat = all(_near_zero(v, tol) for v in (acc_x, acc_y, acc_z))
            if (
                gyro_x is not None
                and gyro_y is not None
                and gyro_z is not None
                and acc_flat
                and all(_near_zero(v, tol) for v in (gyro_x, gyro_y, gyro_z))
                and spo2 is not None
                and spo2 >= self._settings.heart_rate_spo2_fault_threshold
            ):
                return DataState.FAULT, "flat_imu_with_normal_spo2"

        for field_name, value in signals.items():
            if value is None:
                continue
            numeric_range = self._settings.signal_ranges.get(field_name)
            if numeric_range is None:
                continue
            if not numeric_range.contains(float(value)):
                notes.append(f"out_of_range:{field_name}")
                return DataState.INVALID, ",".join(notes)

        systolic = signals["systolic_bp"]
        diastolic = signals["diastolic_bp"]
        if systolic is not None and diastolic is not None:
            if systolic - diastolic < self._settings.min_systolic_diastolic_gap:
                return DataState.INVALID, "bp_order_invalid"

        if acc_x is not None and acc_y is not None and acc_z is not None and spo2 is not None:
            acc_mag = _magnitude(acc_x, acc_y, acc_z)
            if acc_mag <= tol and spo2 >= self._settings.heart_rate_spo2_fault_threshold:
                return DataState.FAULT, "zero_acc_magnitude"

            if gyro_x is not None and gyro_y is not None and gyro_z is not None:
                gyro_mag = _magnitude(gyro_x, gyro_y, gyro_z)
                if gyro_mag <= tol and acc_mag >= self._settings.gyro_motion_acc_threshold:
                    return DataState.FAULT, "zero_gyro_with_high_acc"

        return DataState.VALID, None

    def _build_record(
        self,
        parsed: ParsedQueueMessage,
        state: DataState,
        notes: str | None,
    ) -> CleanVitalRecord:
        row = parsed.sensor.to_clean_vitals_row()
        return CleanVitalRecord(
            message_id=parsed.message_id,
            patient_id=row["patient_id"],
            timestamp=row["timestamp"],
            data_state=state,
            heart_rate=row["heart_rate"],
            rr_interval_ms=row["rr_interval_ms"],
            hrv_rmssd=row["hrv_rmssd"],
            systolic_bp=row["systolic_bp"],
            diastolic_bp=row["diastolic_bp"],
            spo2=row["spo2"],
            acc_x=row["acc_x"],
            acc_y=row["acc_y"],
            acc_z=row["acc_z"],
            acc_magnitude=row["acc_magnitude"],
            gyro_x=row["gyro_x"],
            gyro_y=row["gyro_y"],
            gyro_z=row["gyro_z"],
            gyro_magnitude=row["gyro_magnitude"],
            scenario_id=parsed.scenario_id,
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
