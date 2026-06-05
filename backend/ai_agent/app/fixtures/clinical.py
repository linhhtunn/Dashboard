from __future__ import annotations

from typing import Any

from app.fixtures.demo_data import build_alert_fixture, build_patient_fixture


class FixtureNotFoundError(LookupError):
    """Raised when a fixed fixture does not exist."""


def get_patient_fixture(patient_id: str) -> dict[str, Any]:
    try:
        return build_patient_fixture(patient_id)
    except KeyError as exc:
        raise FixtureNotFoundError(f"Unknown patient fixture: {patient_id}") from exc


def get_alert_fixture(alert_id: str) -> dict[str, Any]:
    try:
        return build_alert_fixture(alert_id)
    except KeyError as exc:
        raise FixtureNotFoundError(f"Unknown alert fixture: {alert_id}") from exc
