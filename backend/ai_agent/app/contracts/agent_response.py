from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ResponseType(StrEnum):
    CHAT = "chat"
    SUMMARY = "summary"
    EXPLAIN_ALERT = "explain-alert"


class ComparisonType(StrEnum):
    VITALS_VS_ACTIVITY = "vitals-vs-activity"
    ALERT_EVIDENCE = "alert-evidence"
    VITALS_TREND = "vitals-trend"


class DataPointStatus(StrEnum):
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    ABNORMAL = "ABNORMAL"
    CRITICAL = "CRITICAL"


def utc_now() -> datetime:
    return datetime.now(UTC)


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DataPoint(ContractModel):
    timestamp: datetime
    metric: str = Field(min_length=1)
    value: float
    unit: str = Field(min_length=1)
    status: DataPointStatus


class Visualization(ContractModel):
    has_chart: bool
    chart_type: str = "time-series"
    chart_title: str = ""
    data_points: list[DataPoint] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_chart_payload(self) -> "Visualization":
        if self.has_chart and not self.data_points:
            raise ValueError("data_points must not be empty when has_chart is true")
        if not self.has_chart and self.data_points:
            raise ValueError("data_points must be empty when has_chart is false")
        return self


class Comparison(ContractModel):
    has_comparison: bool
    comparison_type: ComparisonType
    headers: list[str] = Field(default_factory=list)
    rows: list[list[str]] = Field(default_factory=list)

    @field_validator("headers")
    @classmethod
    def validate_headers(cls, headers: list[str]) -> list[str]:
        if any(not header.strip() for header in headers):
            raise ValueError("headers must not contain empty values")
        return headers

    @model_validator(mode="after")
    def validate_comparison_payload(self) -> "Comparison":
        if self.has_comparison and (not self.headers or not self.rows):
            raise ValueError("headers and rows must not be empty when has_comparison is true")
        if not self.has_comparison and self.rows:
            raise ValueError("rows must be empty when has_comparison is false")
        return self


class AgentResponse(ContractModel):
    schema_version: str = "v1"
    response_type: ResponseType
    patient_id: str = Field(min_length=1)
    source_id: str = Field(min_length=1)
    generated_at: datetime = Field(default_factory=utc_now)
    narrative_summary: str = Field(min_length=1)
    visualizations: Visualization
    comparisons: Comparison

    @model_validator(mode="before")
    @classmethod
    def set_backend_generated_timestamp(cls, data: Any) -> Any:
        if isinstance(data, dict):
            normalized = dict(data)
            normalized["generated_at"] = utc_now()
            return normalized
        return data

    @field_validator("schema_version")
    @classmethod
    def validate_schema_version(cls, schema_version: str) -> str:
        if schema_version != "v1":
            raise ValueError("schema_version must be v1")
        return schema_version


def validate_agent_response(payload: dict[str, Any]) -> AgentResponse:
    return AgentResponse.model_validate(payload)
