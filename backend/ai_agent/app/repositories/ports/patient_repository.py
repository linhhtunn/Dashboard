from typing import Any, Protocol


class PatientRepository(Protocol):
    def get_by_id(self, patient_id: str) -> dict[str, Any]:
        ...

    def list_patient_directory(self, limit: int = 100) -> dict[str, Any]:
        ...

    def search_patients(self, query: str, limit: int = 10) -> dict[str, Any]:
        ...
