from datetime import datetime, timezone

from ingestion.cleaner import CleanVitalRecord, DataState
from ingestion.db_connector import _enrich_raw_payload, _to_db_timestamp
from settings import DEFAULT_CLEAN_VITAL_INSERT_COLUMNS, load_database_settings


def test_to_db_timestamp_strips_tz() -> None:
    dt = _to_db_timestamp("2026-05-28T10:05:02Z")
    assert dt.tzinfo is None
    assert dt.hour == 10


def test_enrich_raw_payload_adds_ingestion_metadata() -> None:
    db = load_database_settings()
    record = CleanVitalRecord(
        message_id="msg_1",
        patient_id="P001",
        timestamp=datetime(2026, 5, 28, 10, 5, 2, tzinfo=timezone.utc),
        data_state=DataState.VALID,
        heart_rate=72.0,
    )
    enriched = _enrich_raw_payload(
        {"message_id": "msg_1"},
        record,
        metadata_key=db.raw_payload_metadata_key,
    )
    meta = enriched[db.raw_payload_metadata_key]
    assert meta["data_state"] == "VALID"


def test_clean_vital_insert_columns_exclude_data_state() -> None:
    assert "heart_rate" in DEFAULT_CLEAN_VITAL_INSERT_COLUMNS
    assert "data_state" not in DEFAULT_CLEAN_VITAL_INSERT_COLUMNS
