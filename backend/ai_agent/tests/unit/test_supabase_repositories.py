from __future__ import annotations

from typing import Any

import pytest

from app.repositories.ports.errors import RepositoryItemNotFoundError
from app.repositories.supabase import SupabaseAlertRepository, SupabasePatientRepository


class FakeSupabaseClient:
    def __init__(self, rows: dict[str, list[dict[str, Any]]]) -> None:
        self.rows = rows

    def select(self, table: str, params: dict[str, Any]) -> list[dict[str, Any]]:
        rows = self.rows.get(table, [])
        limit = int(params.get("limit", len(rows)) or len(rows))

        for key, value in params.items():
            if key in {"select", "order", "limit"}:
                continue
            rows = [row for row in rows if _matches(row.get(key), str(value))]

        return rows[:limit]


def test_supabase_patient_repository_reads_patients_table() -> None:
    repo = SupabasePatientRepository("https://example.supabase.co", "service-key")
    repo.client = FakeSupabaseClient(
        {
            "patients": [
                {
                    "patient_id": "P900",
                    "name": "Nguyen Van Hung",
                    "age": 72,
                    "gender": "male",
                    "status": "warning",
                    "medical_history": "Hypertension",
                }
            ]
        }
    )

    patient = repo.get_by_id("P900")

    assert patient["patient_id"] == "P900"
    assert patient["name"] == "Nguyen Van Hung"
    assert patient["has_hypertension"] is True


def test_supabase_patient_repository_falls_back_to_portal_patients() -> None:
    repo = SupabasePatientRepository("https://example.supabase.co", "service-key")
    repo.client = FakeSupabaseClient(
        {
            "patients": [],
            "portal_patients": [
                {
                    "id": "portal-1",
                    "mrn": "MRN-1",
                    "name": "Tran Thi B",
                    "age": 51,
                    "gender": "female",
                    "status": "healthy",
                    "underlying_condition_codes": ["diabetes"],
                }
            ],
        }
    )

    patient = repo.get_by_id("portal-1")

    assert patient["patient_id"] == "portal-1"
    assert patient["name"] == "Tran Thi B"
    assert patient["has_diabetes"] is True


def test_supabase_patient_repository_raises_when_patient_missing() -> None:
    repo = SupabasePatientRepository("https://example.supabase.co", "service-key")
    repo.client = FakeSupabaseClient({"patients": [], "portal_patients": []})

    with pytest.raises(RepositoryItemNotFoundError):
        repo.get_by_id("NOPE")


def test_supabase_alert_repository_reads_health_alerts() -> None:
    repo = SupabaseAlertRepository("https://example.supabase.co", "service-key")
    repo.client = FakeSupabaseClient(
        {
            "health_alerts": [
                {
                    "alert_id": "ALT-1",
                    "patient_id": "P900",
                    "timestamp": "2026-06-18T00:00:00Z",
                    "alert_type": "low_oxygen",
                    "severity": "critical",
                    "confidence": 0.91,
                    "evidence": [],
                    "message": "SpO2 low",
                }
            ]
        }
    )

    alert = repo.get_by_id("ALT-1")

    assert alert["alert_id"] == "ALT-1"
    assert alert["patient_id"] == "P900"


def _matches(raw: Any, filter_value: str) -> bool:
    value = "" if raw is None else str(raw)
    if filter_value.startswith("eq."):
        return value == filter_value.removeprefix("eq.")
    if filter_value.startswith("ilike."):
        pattern = filter_value.removeprefix("ilike.").replace("*", "").lower()
        return pattern in value.lower()
    return True
