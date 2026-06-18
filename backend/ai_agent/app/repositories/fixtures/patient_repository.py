from typing import Any
import unicodedata

from app.fixtures.clinical import FixtureNotFoundError, PATIENT_FIXTURES, get_patient_fixture
from app.repositories.ports.errors import RepositoryItemNotFoundError


FIXTURE_DIRECTORY = [
    {
        "hospital_patient_code": "P001",
        "subject_id": "P001",
        "patient_id": "P001",
        "display_name": "Nguyen Van A",
        "display_name_normalized": "nguyen van a",
    },
    {
        "hospital_patient_code": "P002",
        "subject_id": "P002",
        "patient_id": "P002",
        "display_name": "Tran Thi B",
        "display_name_normalized": "tran thi b",
    },
    {
        "hospital_patient_code": "P003",
        "subject_id": "P003",
        "patient_id": "P003",
        "display_name": "Nguyen Van A",
        "display_name_normalized": "nguyen van a",
    },
]


class FixturePatientRepository:
    def get_by_id(self, patient_id: str) -> dict[str, Any]:
        try:
            return get_patient_fixture(patient_id)
        except FixtureNotFoundError as exc:
            raise RepositoryItemNotFoundError(str(exc)) from exc

    def list_patient_directory(self, limit: int = 100) -> dict[str, Any]:
        candidates = [
            _candidate_from_directory_entry(entry)
            for entry in FIXTURE_DIRECTORY[:limit]
        ]
        return {
            "patients": candidates,
            "data_availability": {
                "patient_directory": True,
                "source": "fixture",
                "notes": [],
            },
        }

    def search_patients(self, query: str, limit: int = 10) -> dict[str, Any]:
        normalized = _normalize(query)
        matches = []
        for entry in FIXTURE_DIRECTORY:
            haystack = " ".join(
                [
                    entry["hospital_patient_code"].lower(),
                    entry["subject_id"].lower(),
                    entry["display_name_normalized"],
                ]
            )
            if normalized in haystack:
                matches.append(_candidate_from_directory_entry(entry))
        return {
            "query": query,
            "patients": matches[:limit],
            "match_status": _match_status(matches[:limit]),
            "data_availability": {
                "patient_directory": True,
                "source": "fixture",
                "notes": [],
            },
        }


def _candidate_from_directory_entry(entry: dict[str, str]) -> dict[str, Any]:
    patient = PATIENT_FIXTURES.get(entry["patient_id"], {})
    return {
        "hospital_patient_code": entry["hospital_patient_code"],
        "subject_id": entry["subject_id"],
        "patient_id": entry["patient_id"],
        "display_name": entry["display_name"],
        "age": patient.get("age"),
        "gender": patient.get("gender"),
        "health_status": patient.get("health_status", "UNKNOWN"),
        "recent_alerts": patient.get("recent_alerts", []),
        "recent_vitals": patient.get("recent_vitals", []),
        "match_reasons": [],
    }


def _normalize(value: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return " ".join(ascii_text.lower().split())


def _match_status(matches: list[dict[str, Any]]) -> str:
    if not matches:
        return "none"
    if len(matches) == 1:
        return "single"
    return "multiple"
