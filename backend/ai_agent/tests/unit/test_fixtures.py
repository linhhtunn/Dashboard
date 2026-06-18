import pytest

from app.fixtures.clinical import FixtureNotFoundError, get_alert_fixture, get_patient_fixture


def test_patient_fixture_resolves_known_patient() -> None:
    patient = get_patient_fixture("P001")

    assert patient["patient_id"] == "P001"
    assert patient["recent_vitals"]
    assert patient["recent_alerts"]


def test_patient_fixture_rejects_unknown_patient() -> None:
    with pytest.raises(FixtureNotFoundError):
        get_patient_fixture("NO_SUCH_PATIENT")


def test_alert_fixture_resolves_known_alert() -> None:
    alert = get_alert_fixture("ALT_FALL_0092")

    assert alert["alert_id"] == "ALT_FALL_0092"
    assert alert["patient_id"] == "P001"
    assert alert["sensor_context"]


def test_alert_fixture_rejects_unknown_alert() -> None:
    with pytest.raises(FixtureNotFoundError):
        get_alert_fixture("NO_SUCH_ALERT")
