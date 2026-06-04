import pytest

from app.repositories.fixtures import FixtureAlertRepository, FixturePatientRepository
from app.repositories.ports import RepositoryItemNotFoundError


def test_fixture_patient_repository_returns_patient_copy() -> None:
    repository = FixturePatientRepository()

    patient = repository.get_by_id("P001")
    patient["name"] = "Changed"

    assert repository.get_by_id("P001")["name"] == "Nguyen Van A"


def test_fixture_alert_repository_returns_alert_copy() -> None:
    repository = FixtureAlertRepository()

    alert = repository.get_by_id("ALT_FALL_0092")
    alert["message"] = "Changed"

    assert "P001" in repository.get_by_id("ALT_FALL_0092")["message"]


def test_fixture_repositories_raise_port_level_not_found_error() -> None:
    patient_repository = FixturePatientRepository()
    alert_repository = FixtureAlertRepository()

    with pytest.raises(RepositoryItemNotFoundError):
        patient_repository.get_by_id("NO_SUCH_PATIENT")

    with pytest.raises(RepositoryItemNotFoundError):
        alert_repository.get_by_id("NO_SUCH_ALERT")
