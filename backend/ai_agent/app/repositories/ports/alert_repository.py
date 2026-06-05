from typing import Any, Protocol


class AlertRepository(Protocol):
    def get_by_id(self, alert_id: str) -> dict[str, Any]:
        ...

    def list_open(self) -> list[dict[str, Any]]:
        ...

    def list_by_patient(self, patient_id: str) -> list[dict[str, Any]]:
        ...
