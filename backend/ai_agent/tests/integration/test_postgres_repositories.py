import pytest
from datetime import datetime, timezone

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
def test_postgres_alert_repository_fetches_real_data() -> None:
    db_connector = PostgresConnector(dsn)
    repo = PostgresAlertRepository(db_connector)
    
    try:
        # Attempt to get an alert. We catch NotFound since we don't know the active alert IDs
        alert = repo.get_by_id("A001")
        assert alert["alert_id"] == "A001"
        assert "patient_id" in alert
        assert "severity" in alert
        assert "sensor_context" in alert
    except RepositoryItemNotFoundError:
        pass


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
    
    # Since we are querying database directly, response should be successful or we catch errors
    assert response.ok
    assert response.data["patient_id"] == "P001"
    assert "summary" in response.data
