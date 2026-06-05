from typing import Any

from app.fixtures.clinical import FixtureNotFoundError, get_alert_fixture
from app.fixtures.demo_data import get_alert_record, list_alerts
from app.repositories.ports.errors import RepositoryItemNotFoundError


class FixtureAlertRepository:
    def get_by_id(self, alert_id: str) -> dict[str, Any]:
        try:
            return get_alert_fixture(alert_id)
        except FixtureNotFoundError as exc:
            raise RepositoryItemNotFoundError(str(exc)) from exc

    def list_open(self) -> list[dict[str, Any]]:
        return [alert for alert in list_alerts() if not alert["acknowledged"]]

    def list_by_patient(self, patient_id: str) -> list[dict[str, Any]]:
        return [alert for alert in list_alerts() if alert["patient_id"] == patient_id]

    def get_record(self, alert_id: str) -> dict[str, Any]:
        try:
            return get_alert_record(alert_id)
        except KeyError as exc:
            raise RepositoryItemNotFoundError(f"Unknown alert fixture: {alert_id}") from exc
