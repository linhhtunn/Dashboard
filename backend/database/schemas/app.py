from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class DbModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    def db_dict(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)


class PatientCreate(DbModel):
    patient_id: str = Field(..., min_length=1)
    mimic_subject_id: int | None = None
    name: str = Field(..., min_length=1)
    age: int | None = Field(None, ge=0, le=130)
    height_cm: float | None = Field(None, ge=50, le=250)
    weight_kg: float | None = Field(None, gt=0)
    gender: Literal["male", "female", "other", "unknown"] | None = None
    age_group: Literal["child", "young", "adult", "middle_aged", "elderly"] | None = None
    pregnancy_status: Literal["none", "pregnant", "postpartum", "unknown"] | None = None
    lifestyle: str | None = None
    risk_factors: list[str] = Field(default_factory=list)
    activity_level: Literal["low", "medium", "high"] | None = None
    medical_history: str | None = None
    health_status: Literal["NORMAL", "WARNING", "CRITICAL", "UNKNOWN"] | None = None
    baseline_signals: dict[str, Any] = Field(default_factory=dict)
    status: Literal["active", "inactive"] = "active"


class PatientLabResultCreate(DbModel):
    lab_result_id: str = Field(..., min_length=1)
    patient_id: str = Field(..., min_length=1)
    sampled_at: date
    panel_type: Literal["chemistry", "hematology", "coagulation", "other"]
    test_name: str = Field(..., min_length=1)
    value_numeric: float | None = None
    value_text: str | None = None
    unit: str | None = None
    reference_range: str | None = None
    abnormal_flag: Literal["low", "high", "critical_low", "critical_high", "normal"] | None = None
    source: str = "simulator"

    @model_validator(mode="after")
    def validate_value(self) -> "PatientLabResultCreate":
        if self.value_numeric is None and self.value_text is None:
            raise ValueError("value_numeric or value_text is required")
        return self


class DeviceCreate(DbModel):
    device_id: str = Field(..., min_length=1)
    patient_id: str = Field(..., min_length=1)
    device_type: str = "simulator"
    vendor: str | None = None
    model: str | None = None
    external_device_key: str | None = None
    status: Literal["active", "inactive", "retired"] = "active"


class DeviceSensorCreate(DbModel):
    sensor_id: str = Field(..., min_length=1)
    device_id: str = Field(..., min_length=1)
    sensor_type: str = Field(..., min_length=1)
    label: str | None = None
    unit: str | None = None
    stream_name: str = Field(..., min_length=1)
    sampling_mode: Literal["continuous", "windowed", "triggered", "batch", "daily"]
    config: dict[str, Any] = Field(default_factory=dict)
    active: bool = True


class AlertCreate(DbModel):
    alert_id: str = Field(..., min_length=1)
    patient_id: str = Field(..., min_length=1)
    alert_type: str = Field(..., min_length=1)
    severity: Literal["low", "medium", "high", "critical"]
    alert_time: datetime
    device_id: str | None = None
    sensor_id: str | None = None
    scenario_id: str | None = None
    source_event_id: str | None = None
    dedup_key: str | None = None
    status: Literal["new", "viewed", "reviewed", "resolved", "dismissed"] = "new"
    shift_id: str | None = None
    claimed_by_staff_id: str | None = None
    reason: str | None = None
    confidence: float | None = Field(None, ge=0, le=1)
    features: dict[str, Any] = Field(default_factory=dict)
    model_version: str | None = None
    rule_version: str | None = None
    source: str = "team3_anomaly"
    resolved_at: datetime | None = None


class AbnormalEpisodeLog(DbModel):
    """Ground-truth episode from simulator abnormal_episodes.json → Supabase."""
    episode_id: str = Field(..., min_length=1)
    patient_id: str = Field(..., min_length=1)
    device_id: str | None = None
    episode_type: str = Field(..., min_length=1)
    start_time: datetime
    end_time: datetime
    duration_seconds: int = Field(..., gt=0)
    duration_minutes: float = Field(..., gt=0)
    peak_heart_rate: int | None = Field(None, ge=20, le=300)
    min_heart_rate: int | None = Field(None, ge=20, le=300)
    systolic_bp_delta_min: int | None = None
    systolic_bp_delta_max: int | None = None
    diastolic_bp_delta_min: int | None = None
    diastolic_bp_delta_max: int | None = None
    spo2_delta_min: float | None = None
    spo2_delta_max: float | None = None
    severity: Literal["low", "medium", "high", "critical"] | None = None
    status: Literal["normal", "abnormal"] = "abnormal"

    @model_validator(mode="after")
    def validate_window(self) -> "AbnormalEpisodeLog":
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be before end_time")
        return self


class WearableFaultLog(DbModel):
    """Fault injection record from simulator fault_log.json → Supabase."""
    patient_id: str = Field(..., min_length=1)
    stream_name: str = Field(..., min_length=1)
    fault_type: str = Field(..., min_length=1)
    occurred_at: datetime = Field(default_factory=_utc_now)
    device_id: str | None = None
    source_message_id: str | None = None
    detail: str | None = None


class AlertContextCreate(DbModel):
    alert_id: str = Field(..., min_length=1)
    patient_id: str = Field(..., min_length=1)
    window_start: datetime | None = None
    window_end: datetime | None = None
    summary: dict[str, Any] = Field(default_factory=dict)
    chart_query_params: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_window(self) -> "AlertContextCreate":
        if self.window_start and self.window_end and self.window_start >= self.window_end:
            raise ValueError("window_start must be before window_end")
        return self
