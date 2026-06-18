from typing import Any, Protocol


class AlertRepository(Protocol):
    def get_by_id(self, alert_id: str) -> dict[str, Any]:
        ...

    def get_latest_alert_id_by_patient(self, patient_id: str) -> str | None:
        ...

    def get_alerts_by_patient(self, patient_id: str, limit: int = 10) -> list[dict[str, Any]]:
        ...
