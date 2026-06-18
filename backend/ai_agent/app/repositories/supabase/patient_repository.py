from __future__ import annotations

from typing import Any

from app.repositories.ports.errors import RepositoryItemNotFoundError
from app.repositories.postgres.patient_repository import (
    _candidate_from_patients_row,
    _candidate_from_row,
    _match_status,
    _normalize,
    _patient_profile_from_patients_row,
    _patient_profile_from_portal_row,
)
from app.repositories.supabase.client import SupabaseRestClient


class SupabasePatientRepository:
    def __init__(self, supabase_url: str, service_key: str) -> None:
        self.client = SupabaseRestClient(supabase_url, service_key)

    def get_by_id(self, patient_id: str) -> dict[str, Any]:
        row = self._find_patient_row(patient_id)
        if row:
            return _patient_profile_from_patients_row(row, requested_patient_id=patient_id)

        portal_row = self._find_portal_patient_row(patient_id)
        if portal_row:
            return _patient_profile_from_portal_row(portal_row, requested_patient_id=patient_id)

        raise RepositoryItemNotFoundError(f"Patient with ID {patient_id} not found in Supabase")

    def list_patient_directory(self, limit: int = 100) -> dict[str, Any]:
        rows = self.client.select(
            "patients",
            {"select": "*", "order": "patient_id.asc", "limit": str(limit)},
        )
        if rows:
            patients = [_candidate_from_patients_row(_patient_candidate_row(row)) for row in rows]
            return {
                "patients": patients,
                "data_availability": {"patient_directory": True, "source": "supabase.patients", "notes": []},
            }

        portal_rows = self.client.select(
            "portal_patients",
            {"select": "*", "order": "id.asc", "limit": str(limit)},
        )
        patients = [_candidate_from_row(_portal_candidate_row(row)) for row in portal_rows]
        return {
            "patients": patients,
            "data_availability": {
                "patient_directory": bool(patients),
                "source": "supabase.portal_patients",
                "notes": [] if patients else ["No Supabase patients found."],
            },
        }

    def search_patients(self, query: str, limit: int = 10) -> dict[str, Any]:
        normalized_query = _normalize(query)
        if not normalized_query:
            return {
                "query": query,
                "patients": [],
                "match_status": "none",
                "data_availability": {"patient_directory": False, "notes": ["Search query is empty."]},
            }

        rows = self._search_patient_rows(query, limit)
        patients = [_candidate_from_patients_row(_patient_candidate_row(row)) for row in rows]
        if not patients:
            portal_rows = self._search_portal_patient_rows(query, limit)
            patients = [_candidate_from_row(_portal_candidate_row(row)) for row in portal_rows]

        if not patients:
            directory = self.list_patient_directory(limit=max(limit * 20, 200)).get("patients", [])
            patients = [
                row
                for row in directory
                if normalized_query in _normalize(str(row.get("display_name") or ""))
                or normalized_query in _normalize(str(row.get("patient_id") or ""))
                or normalized_query in _normalize(str(row.get("hospital_patient_code") or ""))
            ][:limit]

        return {
            "query": query,
            "patients": patients,
            "match_status": _match_status(patients),
            "data_availability": {"patient_directory": True, "source": "supabase", "notes": []},
        }

    def _find_patient_row(self, patient_id: str) -> dict[str, Any] | None:
        rows = self.client.select(
            "patients",
            {"select": "*", "patient_id": f"ilike.{patient_id}", "limit": "1"},
        )
        if rows:
            return rows[0]
        if patient_id.isdigit():
            rows = self.client.select(
                "patients",
                {"select": "*", "mimic_subject_id": f"eq.{patient_id}", "limit": "1"},
            )
            if rows:
                return rows[0]
        return None

    def _find_portal_patient_row(self, patient_id: str) -> dict[str, Any] | None:
        rows = self.client.select(
            "portal_patients",
            {"select": "*", "id": f"ilike.{patient_id}", "limit": "1"},
        )
        if rows:
            return rows[0]
        rows = self.client.select(
            "portal_patients",
            {"select": "*", "mrn": f"ilike.{patient_id}", "limit": "1"},
        )
        return rows[0] if rows else None

    def _search_patient_rows(self, query: str, limit: int) -> list[dict[str, Any]]:
        rows_by_id = self.client.select(
            "patients",
            {"select": "*", "patient_id": f"ilike.*{query}*", "limit": str(limit)},
        )
        rows_by_name = self.client.select(
            "patients",
            {"select": "*", "name": f"ilike.*{query}*", "limit": str(limit)},
        )
        rows = _unique_rows(rows_by_id + rows_by_name, "patient_id")
        if query.isdigit():
            rows += self.client.select(
                "patients",
                {"select": "*", "mimic_subject_id": f"eq.{query}", "limit": str(limit)},
            )
        return _unique_rows(rows, "patient_id")[:limit]

    def _search_portal_patient_rows(self, query: str, limit: int) -> list[dict[str, Any]]:
        rows = []
        for column in ("id", "mrn", "name"):
            rows.extend(
                self.client.select(
                    "portal_patients",
                    {"select": "*", column: f"ilike.*{query}*", "limit": str(limit)},
                )
            )
        return _unique_rows(rows, "id")[:limit]


def _patient_candidate_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "patient_id": row.get("patient_id"),
        "display_name": row.get("name"),
        "gender": row.get("gender"),
        "age": row.get("age"),
    }


def _portal_candidate_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "patient_id": row.get("id"),
        "subject_id": row.get("id"),
        "hospital_patient_code": row.get("mrn"),
        "display_name": row.get("name"),
        "gender": row.get("gender"),
        "age": row.get("age"),
    }


def _unique_rows(rows: list[dict[str, Any]], key: str) -> list[dict[str, Any]]:
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for row in rows:
        row_key = str(row.get(key) or "")
        if not row_key or row_key in seen:
            continue
        seen.add(row_key)
        unique.append(row)
    return unique
