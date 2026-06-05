from __future__ import annotations

from typing import Any

from pydantic import Field

from app.contracts.agent_response import ContractModel


class LocalizedText(ContractModel):
    vi: str
    en: str


class MedicationCycleDTO(ContractModel):
    medication: LocalizedText
    dosage: str
    schedule: LocalizedText
    last_taken_at: str | None = None
    next_dose_at: str | None = None


class PatientDTO(ContractModel):
    id: str = Field(min_length=1)
    mrn: str = Field(min_length=1)
    name: str = Field(min_length=1)
    age: int
    gender: str
    status: str
    ward_code: str
    ward_label: LocalizedText
    department_code: str
    department_label: LocalizedText
    bed: str | None = None
    underlying_condition_codes: list[str]
    medication_cycle: list[MedicationCycleDTO]
    recent_symptom_codes: list[str]
    last_updated: str
    medical_history: str


class VitalSampleDTO(ContractModel):
    patient_id: str = Field(min_length=1)
    timestamp: str
    heart_rate: float
    hrv_rmssd: float
    systolic_bp: float
    diastolic_bp: float
    spo2: float


class MetricSummaryDTO(ContractModel):
    metric: str
    current_value: float
    unit: str
    average_15m: float
    trend: str
    change_pct: int
    status: str


class AlertDTO(ContractModel):
    id: str = Field(min_length=1)
    patient_id: str = Field(min_length=1)
    type: str
    severity: str
    score: float | None = None
    evidence: list[dict[str, Any]]
    timestamp: str
    acknowledged: bool
    message: str


class PatientListItemDTO(ContractModel):
    patient: PatientDTO
    latest_vital: VitalSampleDTO | None = None
    open_alert_count: int = 0


class PatientVitalsResponseDTO(ContractModel):
    patient_id: str
    range: str
    samples: list[VitalSampleDTO]
    metric_summaries: list[MetricSummaryDTO]


class ThreadMessageDTO(ContractModel):
    role: str
    content: str


class ThreadMetaDTO(ContractModel):
    conversation_id: str
    doctor_id: str
    patient_id: str | None = None
    title: str
    last_message_at: str
    last_issue: str | None = None
    last_intent: str | None = None


class ThreadDetailDTO(ContractModel):
    meta: ThreadMetaDTO
    messages: list[ThreadMessageDTO] = Field(default_factory=list)
