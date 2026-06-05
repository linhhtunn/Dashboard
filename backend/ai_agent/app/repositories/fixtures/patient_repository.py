from typing import Any

from app.fixtures.clinical import FixtureNotFoundError, get_patient_fixture
from app.fixtures.demo_data import (
    get_patient_record,
    list_patients,
    list_vitals,
    summarize_metrics,
)
from app.repositories.ports.errors import RepositoryItemNotFoundError


class FixturePatientRepository:
    def get_by_id(self, patient_id: str) -> dict[str, Any]:
        try:
            return get_patient_fixture(patient_id)
        except FixtureNotFoundError as exc:
            raise RepositoryItemNotFoundError(str(exc)) from exc

    def list(self, *, query: str | None = None, status: str | None = None) -> list[dict[str, Any]]:
        items = list_patients()
        if query:
            normalized = query.strip().lower()
            items = [
                item
                for item in items
                if normalized in item["name"].lower()
                or normalized in item["mrn"].lower()
                or normalized in item["id"].lower()
            ]
        if status:
            items = [item for item in items if item["status"] == status]
        return items

    def get_vitals(self, patient_id: str, *, time_range: str = "15m") -> list[dict[str, Any]]:
        try:
            get_patient_record(patient_id)
        except KeyError as exc:
            raise RepositoryItemNotFoundError(f"Unknown patient fixture: {patient_id}") from exc
        return list_vitals(patient_id)

    def get_metric_summaries(self, patient_id: str) -> list[dict[str, Any]]:
        try:
            get_patient_record(patient_id)
        except KeyError as exc:
            raise RepositoryItemNotFoundError(f"Unknown patient fixture: {patient_id}") from exc
        return summarize_metrics(patient_id)
