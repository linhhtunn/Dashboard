from typing import Any

from app.fixtures.clinical import FixtureNotFoundError, get_alert_fixture
from app.repositories.ports.errors import RepositoryItemNotFoundError


class FixtureAlertRepository:
    def get_by_id(self, alert_id: str) -> dict[str, Any]:
        try:
            return get_alert_fixture(alert_id)
        except FixtureNotFoundError as exc:
            raise RepositoryItemNotFoundError(str(exc)) from exc

    def get_latest_alert_id_by_patient(self, patient_id: str) -> str | None:
        from app.fixtures.clinical import ALERT_FIXTURES
        matching = [
            a for a in ALERT_FIXTURES.values() 
            if a.get("patient_id") == patient_id
        ]
        if not matching:
            return None
        matching.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return matching[0]["alert_id"]

    def get_alerts_by_patient(self, patient_id: str, limit: int = 10) -> list[dict[str, Any]]:
        from app.fixtures.clinical import ALERT_FIXTURES
        matching = [
            a for a in ALERT_FIXTURES.values() 
            if a.get("patient_id") == patient_id
        ]
        matching.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return matching[:limit]
