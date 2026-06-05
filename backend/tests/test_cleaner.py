import json
from pathlib import Path

import pytest

from ingestion.cleaner import DataState, VitalCleaner

FIXTURES = Path(__file__).parent / "fixtures" / "sample_messages.json"
SIMULATOR_FIXTURE = Path(__file__).parent / "fixtures" / "sample_simulator_message.json"


@pytest.fixture
def cleaner() -> VitalCleaner:
    return VitalCleaner()


@pytest.fixture
def samples() -> list[dict]:
    return json.loads(FIXTURES.read_text(encoding="utf-8"))


def test_valid_message_classified_as_valid(cleaner: VitalCleaner, samples: list[dict]) -> None:
    _, record = cleaner.clean_payload(samples[0])
    assert record.data_state == DataState.VALID
    assert record.heart_rate == 72
    assert record.hrv_rmssd == 48
    assert record.acc_magnitude is not None


def test_out_of_range_heart_rate_is_invalid(cleaner: VitalCleaner, samples: list[dict]) -> None:
    _, record = cleaner.clean_payload(samples[1])
    assert record.data_state == DataState.INVALID


def test_zero_heart_rate_with_normal_spo2_is_sensor_fault(cleaner: VitalCleaner, samples: list[dict]) -> None:
    _, record = cleaner.clean_payload(samples[2])
    assert record.data_state == DataState.SENSOR_FAULT


def test_duplicate_flag_overrides_state(cleaner: VitalCleaner, samples: list[dict]) -> None:
    _, record = cleaner.clean_payload(samples[0], is_duplicate=True)
    assert record.data_state == DataState.DUPLICATE


def test_invalid_json_bytes_returns_invalid(cleaner: VitalCleaner) -> None:
    _, record = cleaner.clean_payload(b'{"message_id":"x"}')
    assert record.data_state == DataState.INVALID


def test_missing_signals_returns_invalid(cleaner: VitalCleaner) -> None:
    payload = {
        "message_id": "msg_missing_signals",
        "patient_id": "P001",
        "timestamp": "2026-05-28T10:05:02Z",
        "signals": {"heart_rate": 72},
    }
    _, record = cleaner.clean_payload(payload)
    assert record.data_state == DataState.INVALID
    assert "missing signals" in (record.validation_notes or "")


def test_simulator_payload(cleaner: VitalCleaner) -> None:
    payload = json.loads(SIMULATOR_FIXTURE.read_text(encoding="utf-8"))
    parsed, record = cleaner.clean_payload(payload)
    assert record.data_state == DataState.VALID
    assert record.hrv_rmssd == 68
    assert record.rr_interval_ms == 833.33
    assert record.acc_magnitude == pytest.approx(0.9905, rel=1e-3)
    assert parsed is not None
    assert parsed.scenario_id == "SCN_NORMAL_001"
