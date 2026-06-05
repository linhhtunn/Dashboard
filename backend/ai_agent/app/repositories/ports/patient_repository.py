from typing import Any, Protocol


class PatientRepository(Protocol):
    def get_by_id(self, patient_id: str) -> dict[str, Any]:
        ...

    def list(self, *, query: str | None = None, status: str | None = None) -> list[dict[str, Any]]:
        ...

    def get_vitals(self, patient_id: str, *, time_range: str = "15m") -> list[dict[str, Any]]:
        ...

    def get_metric_summaries(self, patient_id: str) -> list[dict[str, Any]]:
        ...
