from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field, field_validator


class ChatIntent(StrEnum):
    PATIENT_SUMMARY = "patient_summary"
    EXPLAIN_ALERT = "explain_alert"
    MEDICATION_RECOMMENDATION = "medication_recommendation"
    VITALS_TREND = "vitals_trend"
    DOCTOR_PATIENT_OVERVIEW = "doctor_patient_overview"
    PATIENT_LOOKUP = "patient_lookup"
    GENERAL_CHAT = "general_chat"
    GENERAL_MEDICAL_QA = "general_medical_qa"
    OUT_OF_SCOPE = "out_of_scope"
    UNKNOWN = "unknown"


class IntentArguments(BaseModel):
    patient_id: str | None = None
    alert_id: str | None = None
    time_window_minutes: int | None = Field(default=None, ge=1)
    query: str | None = None
    hospital_patient_code: str | None = None
    subject_id: str | None = None
    medication_domain: str | None = None


class IntentClassification(BaseModel):
    intent: ChatIntent
    confidence: float = Field(ge=0.0, le=1.0)
    arguments: IntentArguments = Field(default_factory=IntentArguments)
    needs_clarification: bool = False
    clarifying_question: str | None = None

    @field_validator("clarifying_question")
    @classmethod
    def normalize_question(cls, value: str | None) -> str | None:
        if value is None:
            return None
        text = value.strip()
        return text or None

    def is_actionable(self, *, min_confidence: float = 0.55) -> bool:
        return (
            self.confidence >= min_confidence
            and not self.needs_clarification
            and self.intent is not ChatIntent.UNKNOWN
        )
