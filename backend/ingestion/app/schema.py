from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class VitalMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1]
    event_id: str = Field(min_length=8, max_length=128)
    deduplication_key: str = Field(min_length=8, max_length=200)
    patient_token: str = Field(min_length=8, max_length=128)
    observed_at: datetime
    heart_rate: float | None = Field(default=None, ge=20, le=300)
    respiratory_rate: float | None = Field(default=None, ge=2, le=80)
    spo2: float | None = Field(default=None, ge=50, le=100)
    systolic_bp: float | None = Field(default=None, ge=40, le=300)
    diastolic_bp: float | None = Field(default=None, ge=20, le=200)

    @field_validator("observed_at")
    @classmethod
    def observed_at_must_be_timezone_aware(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("observed_at must include a timezone")
        if value > datetime.now(timezone.utc).astimezone(value.tzinfo):
            raise ValueError("observed_at cannot be in the future")
        return value

    @field_validator("diastolic_bp")
    @classmethod
    def validate_at_least_one_vital(cls, value: float | None, info):
        values = info.data
        if value is None and not any(
            values.get(name) is not None
            for name in ("heart_rate", "respiratory_rate", "spo2", "systolic_bp")
        ):
            raise ValueError("at least one vital is required")
        return value
