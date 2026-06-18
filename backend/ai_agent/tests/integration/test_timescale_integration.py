import pytest
from datetime import datetime, timezone
from app.core.config import Settings
from app.infrastructure.database import PostgresConnector
from app.repositories.timescale.vitals_repository import TimescaleVitalsRepository

settings = Settings()
timescale_url = settings.timescale_db_url


@pytest.mark.skipif(not timescale_url, reason="TimescaleDB URL is not configured")
def test_timescale_vitals_summary_integration() -> None:
    db_connector = PostgresConnector(timescale_url)
    repo = TimescaleVitalsRepository(db_connector)

    # Fetch latest timestamp to query around
    max_ts = repo.get_latest_timestamp("P001")
    assert max_ts is not None, "Failed to get latest timestamp for P001"
    assert isinstance(max_ts, datetime)

    # Query summary
    summary = repo.get_vitals_summary(
        patient_id="P001",
        time_window_minutes=30,
        interval_seconds=60,
        end_time=max_ts,
    )
    
    assert isinstance(summary, list)
    if summary:
        assert "time_bucket" in summary[0]
        # At least one vital sign should be populated (since it's a UNION ALL)
        assert any(
            summary[0].get(k) is not None 
            for k in ["avg_heart_rate", "avg_spo2", "avg_systolic_bp"]
        )


@pytest.mark.skipif(not timescale_url, reason="TimescaleDB URL is not configured")
def test_timescale_sleep_stage_integration() -> None:
    db_connector = PostgresConnector(timescale_url)
    repo = TimescaleVitalsRepository(db_connector)

    # We know from our inspection that P004 has sleep stages on 2026-06-16
    ts = datetime(2026, 6, 16, 21, 50, tzinfo=timezone.utc)
    stage = repo.get_sleep_stage("P004", ts)
    assert stage == "awake"
