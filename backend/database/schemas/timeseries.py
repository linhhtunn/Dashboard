from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class DbModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    def db_dict(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)


class RawSensorEvent(DbModel):
    stream_name: str = Field(..., min_length=1)
    raw_payload: dict[str, Any]
    time: datetime | None = None
    received_at: datetime = Field(default_factory=utc_now)
    message_id: str | None = None
    patient_id: str | None = None
    device_id: str | None = None
    event_type: str | None = None
    trigger_type: str | None = None


class WearableContinuous(DbModel):
    time: datetime
    message_id: str = Field(..., min_length=1)
    patient_id: str = Field(..., min_length=1)
    device_id: str = Field(..., min_length=1)
    received_at: datetime = Field(default_factory=utc_now)
    heart_rate: int | None = Field(None, ge=20, le=260)
    respiratory_rate: int | None = Field(None, ge=4, le=60)


class WearableInterval(DbModel):
    time: datetime
    window_start: datetime
    window_end: datetime
    message_id: str = Field(..., min_length=1)
    patient_id: str = Field(..., min_length=1)
    device_id: str = Field(..., min_length=1)
    interval_type: Literal["steps", "stress"]
    received_at: datetime = Field(default_factory=utc_now)
    interval_seconds: int = Field(60, gt=0)
    steps_count: int | None = Field(None, ge=0)
    steps_rate_per_min: int | None = Field(None, ge=0)
    activity_type: str | None = None
    stress_score: int | None = Field(None, ge=0, le=100)
    stress_level: Literal["rest", "low", "medium", "high"] | None = None

    @model_validator(mode="after")
    def validate_window(self) -> "WearableInterval":
        if self.window_start >= self.window_end:
            raise ValueError("window_start must be before window_end")
        return self


class PpiPatch(DbModel):
    time: datetime
    window_start: datetime
    window_end: datetime
    message_id: str = Field(..., min_length=1)
    patient_id: str = Field(..., min_length=1)
    device_id: str = Field(..., min_length=1)
    received_at: datetime = Field(default_factory=utc_now)
    interval_seconds: int = Field(15, gt=0)
    ppi_intervals_ms: list[int] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_window(self) -> "PpiPatch":
        if self.window_start >= self.window_end:
            raise ValueError("window_start must be before window_end")
        return self


class WearableMeasurement(DbModel):
    time: datetime
    message_id: str = Field(..., min_length=1)
    patient_id: str = Field(..., min_length=1)
    device_id: str = Field(..., min_length=1)
    measurement_type: Literal["blood_pressure", "spo2", "battery"]
    received_at: datetime = Field(default_factory=utc_now)
    systolic_bp: int | None = Field(None, ge=60, le=260)
    diastolic_bp: int | None = Field(None, ge=30, le=180)
    spo2: int | None = Field(None, ge=0, le=100)
    battery_level: int | None = Field(None, ge=0, le=100)
    @model_validator(mode="after")
    def validate_measurement(self) -> "WearableMeasurement":
        if self.systolic_bp is not None and self.diastolic_bp is not None:
            if self.systolic_bp <= self.diastolic_bp:
                raise ValueError("systolic_bp must be greater than diastolic_bp")
        return self


class MotionBatch(DbModel):
    time: datetime
    window_start: datetime
    window_end: datetime
    message_id: str = Field(..., min_length=1)
    patient_id: str = Field(..., min_length=1)
    device_id: str = Field(..., min_length=1)
    motion_sampling_rate_hz: int = Field(..., gt=0)
    motion_points: list[dict[str, Any]]
    received_at: datetime = Field(default_factory=utc_now)

    @model_validator(mode="after")
    def validate_window(self) -> "MotionBatch":
        if self.window_start >= self.window_end:
            raise ValueError("window_start must be before window_end")
        return self


class EcgMeasurement(DbModel):
    measurement_id: str = Field(..., min_length=1)
    time: datetime
    message_id: str = Field(..., min_length=1)
    patient_id: str = Field(..., min_length=1)
    device_id: str = Field(..., min_length=1)
    received_at: datetime = Field(default_factory=utc_now)
    ecg_result: str | None = None
    ecg_rhythm: str | None = None
    ecg_abnormal_flags: list[str] = Field(default_factory=list)
    ecg_lead: str | None = None
    ecg_unit: str | None = None
    ecg_sampling_rate_hz: int | None = Field(None, gt=0)
    ecg_duration_seconds: int | None = Field(None, gt=0)
    ecg_points: list[dict[str, Any]] = Field(default_factory=list)


class SleepSession(DbModel):
    sleep_session_id: str = Field(..., min_length=1)
    patient_id: str = Field(..., min_length=1)
    sleep_date: date
    start_time: datetime
    end_time: datetime
    sleep_duration_min: int = Field(..., ge=0)
    device_id: str | None = None
    sleep_score: int | None = Field(None, ge=0, le=100)
    sleep_quality: str | None = None
    detail: list[dict[str, Any]] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_window(self) -> "SleepSession":
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be before end_time")
        return self


class SleepStageInterval(DbModel):
    stage_id: str = Field(..., min_length=1)
    sleep_session_id: str = Field(..., min_length=1)
    patient_id: str = Field(..., min_length=1)
    start_time: datetime
    end_time: datetime
    state: Literal["awake", "light", "deep", "rem"]
    duration_min: int = Field(..., ge=0)
    device_id: str | None = None

    @model_validator(mode="after")
    def validate_window(self) -> "SleepStageInterval":
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be before end_time")
        return self


class DailyHrvMetrics(DbModel):
    patient_id: str = Field(..., min_length=1)
    date: date
    measured_at: datetime
    hrv_rmssd_morning: int = Field(..., ge=0)


class ActivityTimelineSegment(DbModel):
    time: datetime
    patient_id: str = Field(..., min_length=1)
    device_id: str = Field(..., min_length=1)
    kind: Literal["sleep", "activity"]
    state: str = Field(..., min_length=1)
    start_time: datetime
    end_time: datetime
    duration_minutes: float = Field(..., ge=0)

    @model_validator(mode="after")
    def validate_window(self) -> "ActivityTimelineSegment":
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be before end_time")
        return self


class HealthFeature(DbModel):
    time: datetime
    patient_id: str = Field(..., min_length=1)
    device_id: str = Field(..., min_length=1)
    feature_window: str = Field(..., min_length=1)
    source_window_start: datetime
    source_window_end: datetime
    avg_heart_rate: float | None = None
    max_heart_rate: float | None = None
    avg_respiratory_rate: float | None = None
    min_spo2: float | None = None
    avg_stress_score: float | None = None
    ppi_rmssd_ms_avg: float | None = None
    steps_count: int | None = Field(None, ge=0)
    acc_magnitude_max: float | None = None
    gyro_magnitude_max: float | None = None
    anomaly_score: float | None = None
    features: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_window(self) -> "HealthFeature":
        if self.source_window_start >= self.source_window_end:
            raise ValueError("source_window_start must be before source_window_end")
        return self


class LatestSensorValue(DbModel):
    patient_id: str = Field(..., min_length=1)
    device_id: str = Field(..., min_length=1)
    metric: str = Field(..., min_length=1)
    last_measured_at: datetime
    stream_name: str = Field(..., min_length=1)
    value_numeric: float | None = None
    value_text: str | None = None
    unit: str | None = None
    received_at: datetime = Field(default_factory=utc_now)
