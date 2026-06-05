from typing import Any

from app.fixtures.clinical import FixtureNotFoundError, get_patient_fixture
from app.repositories.ports.errors import RepositoryItemNotFoundError


class FixturePatientRepository:
    def get_by_id(self, patient_id: str) -> dict[str, Any]:
        try:
            return get_patient_fixture(patient_id)
        except FixtureNotFoundError as exc:
            raise RepositoryItemNotFoundError(str(exc)) from exc
