from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.schema import VitalMessage


def valid_payload() -> dict:
    return {
        "schema_version": 1,
        "event_id": "evt-12345",
        "deduplication_key": "device-1:1700000000",
        "patient_token": "patient-token-1",
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "heart_rate": 82,
    }


def test_accepts_versioned_vital_message() -> None:
    assert VitalMessage.model_validate(valid_payload()).heart_rate == 82


@pytest.mark.parametrize("field,value", [("schema_version", 2), ("spo2", 101)])
def test_rejects_invalid_contract(field: str, value: object) -> None:
    payload = valid_payload()
    payload[field] = value
    with pytest.raises(ValidationError):
        VitalMessage.model_validate(payload)


def test_rejects_duplicate_unknown_fields() -> None:
    payload = valid_payload()
    payload["patient_name"] = "PHI must not enter ingestion messages"
    with pytest.raises(ValidationError):
        VitalMessage.model_validate(payload)
