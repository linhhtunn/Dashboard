import pytest
from unittest.mock import MagicMock
from datetime import datetime, timezone
from app.repositories.timescale.vitals_repository import TimescaleVitalsRepository


def test_timescale_vitals_summary_with_mock_db() -> None:
    # Arrange
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur
    
    mock_db_connector = MagicMock()
    mock_db_connector.connection.return_value.__enter__.return_value = mock_conn

    # Setup mock data returned from DB
    mock_time = datetime(2026, 6, 17, 8, 0, 0, tzinfo=timezone.utc)
    mock_row = {
        "time_bucket": mock_time,
        "avg_heart_rate": 80.0,
        "min_heart_rate": 70.0,
        "max_heart_rate": 90.0,
        "avg_spo2": 98.0,
        "min_spo2": 97.0,
        "max_spo2": 99.0,
        "avg_systolic_bp": 120.0,
        "min_systolic_bp": 115.0,
        "max_systolic_bp": 125.0,
        "avg_diastolic_bp": 80.0,
        "min_diastolic_bp": 75.0,
        "max_diastolic_bp": 85.0,
    }
    mock_cur.fetchall.return_value = [mock_row]

    repo = TimescaleVitalsRepository(mock_db_connector)

    # Act
    summary = repo.get_vitals_summary(
        patient_id="P001",
        time_window_minutes=30,
        interval_seconds=60,
        end_time=mock_time,
    )

    # Assert
    assert len(summary) == 1
    assert summary[0]["time_bucket"] == "2026-06-17T08:00:00Z"
    assert summary[0]["avg_heart_rate"] == 80.0
    assert summary[0]["avg_spo2"] == 98.0
    mock_cur.execute.assert_called_once()


def test_timescale_sleep_stage_with_mock_db() -> None:
    # Arrange
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur
    
    mock_db_connector = MagicMock()
    mock_db_connector.connection.return_value.__enter__.return_value = mock_conn

    mock_cur.fetchone.return_value = {"state": "deep"}

    repo = TimescaleVitalsRepository(mock_db_connector)

    # Act
    sleep_stage = repo.get_sleep_stage("P001", datetime.now(timezone.utc))

    # Assert
    assert sleep_stage == "deep"
    mock_cur.execute.assert_called_once()
