from typing import Any

from app.fixtures.clinical import FixtureNotFoundError, get_alert_fixture
from app.repositories.ports.errors import RepositoryItemNotFoundError


class FixtureAlertRepository:
    def get_by_id(self, alert_id: str) -> dict[str, Any]:
        try:
            return get_alert_fixture(alert_id)
        except FixtureNotFoundError as exc:
            raise RepositoryItemNotFoundError(str(exc)) from exc
