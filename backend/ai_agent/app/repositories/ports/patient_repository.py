from typing import Any, Protocol


class PatientRepository(Protocol):
    def get_by_id(self, patient_id: str) -> dict[str, Any]:
        ...
