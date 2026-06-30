import hashlib
import hmac
import json
from datetime import datetime, timezone
from typing import Protocol

import httpx
from pydantic import BaseModel, ConfigDict


class PatientReference(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source_system: str
    source_patient_id: str
    department_code: str
    updated_at: datetime


class HisAdapter(Protocol):
    async def get_patient_reference(self, source_patient_id: str) -> PatientReference: ...


class FhirR4Adapter:
    def __init__(self, base_url: str, access_token: str, source_system: str = "hospital-fhir"):
        self.base_url = base_url.rstrip("/")
        self.access_token = access_token
        self.source_system = source_system

    async def get_patient_reference(self, source_patient_id: str) -> PatientReference:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{self.base_url}/Patient/{source_patient_id}",
                headers={"Authorization": f"Bearer {self.access_token}", "Accept": "application/fhir+json"},
            )
            response.raise_for_status()
            resource = response.json()
        if resource.get("resourceType") != "Patient" or resource.get("id") != source_patient_id:
            raise ValueError("FHIR Patient contract mismatch")
        department = next(
            (
                extension.get("valueCode")
                for extension in resource.get("extension", [])
                if extension.get("url", "").endswith("department-code")
            ),
            None,
        )
        if not department:
            raise ValueError("FHIR Patient is missing department-code")
        return PatientReference(
            source_system=self.source_system,
            source_patient_id=source_patient_id,
            department_code=department,
            updated_at=datetime.now(timezone.utc),
        )


def verify_signed_batch(raw_body: bytes, signature: str, shared_secret: str) -> list[PatientReference]:
    expected = hmac.new(shared_secret.encode(), raw_body, hashlib.sha256).hexdigest()
    provided = signature.removeprefix("sha256=")
    if not hmac.compare_digest(expected, provided):
        raise ValueError("Invalid batch signature")
    payload = json.loads(raw_body)
    if payload.get("schema_version") != 1:
        raise ValueError("Unsupported batch schema version")
    return [PatientReference.model_validate(item) for item in payload.get("patients", [])]
