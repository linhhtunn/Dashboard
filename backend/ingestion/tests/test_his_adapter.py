import hashlib
import hmac
import json
from datetime import datetime, timezone

import pytest

from app.his_adapter import verify_signed_batch


def test_signed_batch_contract() -> None:
    secret = "test-shared-secret"
    raw = json.dumps(
        {
            "schema_version": 1,
            "patients": [
                {
                    "source_system": "hospital-fhir",
                    "source_patient_id": "P001",
                    "department_code": "cardiology",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            ],
        }
    ).encode()
    signature = hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    assert verify_signed_batch(raw, f"sha256={signature}", secret)[0].source_patient_id == "P001"


def test_signed_batch_rejects_tampering() -> None:
    with pytest.raises(ValueError, match="signature"):
        verify_signed_batch(b'{"schema_version":1}', "sha256=bad", "secret")
