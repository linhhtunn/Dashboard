from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.repositories.ports import PatientRepository


@dataclass(frozen=True)
class PatientContextResolver:
    patient_repository: PatientRepository

    def resolve(self, state: dict[str, Any]) -> dict[str, Any]:
        patient_id = state.get("patient_id") or None
        if patient_id:
            return self.patient_repository.get_by_id(patient_id)
        return {
            "patient_id": None,
            "name": "Doctor-scoped patient directory",
            "scope": "doctor_patient_list",
            "doctor_id": state.get("doctor_id") or "D1",
            "medical_history": "No single patient is selected for this request.",
            "health_status": "UNKNOWN",
            "recent_alerts": [],
            "recent_vitals": [],
        }
