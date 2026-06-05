from typing import Any, Protocol


class AlertRepository(Protocol):
    def get_by_id(self, alert_id: str) -> dict[str, Any]:
        ...
