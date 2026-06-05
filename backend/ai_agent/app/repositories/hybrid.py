from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.repositories.fixtures import FixtureAlertRepository, FixturePatientRepository
from app.repositories.ports import RepositoryItemNotFoundError


@dataclass(frozen=True)
class HybridPatientRepository:
    primary: Any
    fallback: FixturePatientRepository

    def get_by_id(self, patient_id: str) -> dict[str, Any]:
        try:
            return self.primary.get_by_id(patient_id)
        except RepositoryItemNotFoundError:
            return self.fallback.get_by_id(patient_id)

    def list(self, *, query: str | None = None, status: str | None = None) -> list[dict[str, Any]]:
        return self.fallback.list(query=query, status=status)

    def get_vitals(self, patient_id: str, *, time_range: str = "15m") -> list[dict[str, Any]]:
        try:
            return self.primary.get_vitals(patient_id, time_range=time_range)
        except (AttributeError, RepositoryItemNotFoundError):
            return self.fallback.get_vitals(patient_id, time_range=time_range)

    def get_metric_summaries(self, patient_id: str) -> list[dict[str, Any]]:
        try:
            return self.primary.get_metric_summaries(patient_id)
        except (AttributeError, RepositoryItemNotFoundError):
            return self.fallback.get_metric_summaries(patient_id)


@dataclass(frozen=True)
class HybridAlertRepository:
    primary: Any
    fallback: FixtureAlertRepository

    def get_by_id(self, alert_id: str) -> dict[str, Any]:
        try:
            return self.primary.get_by_id(alert_id)
        except RepositoryItemNotFoundError:
            return self.fallback.get_by_id(alert_id)

    def list_open(self) -> list[dict[str, Any]]:
        try:
            items = self.primary.list_open()
            return items if items else self.fallback.list_open()
        except (AttributeError, RepositoryItemNotFoundError):
            return self.fallback.list_open()

    def list_by_patient(self, patient_id: str) -> list[dict[str, Any]]:
        try:
            items = self.primary.list_by_patient(patient_id)
            return items if items else self.fallback.list_by_patient(patient_id)
        except (AttributeError, RepositoryItemNotFoundError):
            return self.fallback.list_by_patient(patient_id)
