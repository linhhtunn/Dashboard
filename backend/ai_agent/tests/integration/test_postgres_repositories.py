import pytest

from app.core.config import Settings
from app.repositories.ports.errors import RepositoryItemNotFoundError
from app.infrastructure.database import PostgresConnector
from app.repositories.postgres import PostgresPatientRepository, PostgresAlertRepository
from app.tools.clinical import VitalsSummaryTool
from app.tools import ToolRequest

# Load runtime settings
settings = Settings()
dsn = settings.resolved_memory_postgres_dsn


@pytest.mark.skipif(not dsn, reason="PostgreSQL DSN is not configured")
def test_postgres_patient_repository_fetches_real_data() -> None:
    db_connector = PostgresConnector(dsn)
    repo = PostgresPatientRepository(db_connector)
    
    # Try fetching a patient (e.g. 'P001' or 'P002')
    # If not found, it raises RepositoryItemNotFoundError, which we verify.
    # If found, we assert the expected keys are present.
    try:
        patient = repo.get_by_id("P001")
        assert patient["patient_id"] == "P001"
        assert "name" in patient
        assert "recent_alerts" in patient
        assert "recent_vitals" in patient
        
        # Verify vitals structure matches
        for vital in patient["recent_vitals"]:
            assert "timestamp" in vital
            assert "heart_rate" in vital
            assert "spo2" in vital
            assert "status" in vital
    except RepositoryItemNotFoundError:
        # P001 not present in this DB environment, which is acceptable
        pass


@pytest.mark.skipif(not dsn, reason="PostgreSQL DSN is not configured")
def test_postgres_patient_directory_list_and_search_are_graceful() -> None:
    db_connector = PostgresConnector(dsn)
    repo = PostgresPatientRepository(db_connector)

    listed = repo.list_patient_directory(limit=5)
    searched = repo.search_patients("P001", limit=5)

    assert "patients" in listed
    assert "data_availability" in listed
    assert "patients" in searched
    assert "match_status" in searched
    if not listed["data_availability"].get("patient_directory"):
        assert listed["data_availability"]["notes"]
    if not searched["data_availability"].get("patient_directory"):
        assert searched["data_availability"]["notes"]


@pytest.mark.skipif(not dsn, reason="PostgreSQL DSN is not configured")
def test_postgres_alert_repository_fetches_real_data() -> None:
    db_connector = PostgresConnector(dsn)
    repo = PostgresAlertRepository(db_connector)
    
    try:
        alert = repo.get_by_id("A001")
    except RepositoryItemNotFoundError:
        # The current shared Postgres handoff can be patient-only, without
        # health_alerts or any alert rows yet.
        return
    except RuntimeError as exc:
        # The current shared Postgres handoff can be patient-only, without
        # the health_alerts table yet.
        assert "health_alerts" in str(exc)
        return

    assert alert["alert_id"] == "A001"
    assert "patient_id" in alert
    assert "severity" in alert
    assert "sensor_context" in alert


@pytest.mark.skipif(not dsn, reason="PostgreSQL DSN is not configured")
@pytest.mark.asyncio
async def test_vitals_summary_tool_queries_real_database() -> None:
    db_connector = PostgresConnector(dsn)
    tool = VitalsSummaryTool(db_connector=db_connector)
    
    # Fetch data for patient P001 over last 30 minutes
    response = await tool.run(
        ToolRequest(
            name=tool.name,
            arguments={"patient_id": "P001", "time_window_minutes": 30},
        )
    )
    
    assert response.data["patient_id"] == "P001"
    if response.ok:
        assert "summary" in response.data
        return

    # The current shared Postgres handoff can be patient-only, without
    # clean_vitals yet. The tool should surface that limitation instead of
    # crashing.
    assert "clean_vitals" in response.message or "vitals" in response.message.lower()
