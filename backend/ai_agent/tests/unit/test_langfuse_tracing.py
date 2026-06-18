import pytest

from app.core.config import Settings
from app.observability import (
    RecordingTracer,
    configure_tracer_for_testing,
    observe,
    reset_tracer_for_testing,
    sanitize_patient_id,
)
from app.observability.langfuse_tracing import maybe_capture_content, sanitize_metadata


def test_sanitize_patient_id_hash_is_stable_and_not_raw() -> None:
    settings = Settings(LANGFUSE_PATIENT_ID_MODE="hash", LANGFUSE_HASH_SALT="test")

    first = sanitize_patient_id("10003400", settings)
    second = sanitize_patient_id("10003400", settings)

    assert first == second
    assert first != "10003400"
    assert len(first) == 16


def test_sanitize_patient_id_modes() -> None:
    assert sanitize_patient_id("10003400", Settings(LANGFUSE_PATIENT_ID_MODE="masked")) == "1000****"
    assert sanitize_patient_id("10003400", Settings(LANGFUSE_PATIENT_ID_MODE="raw")) == "10003400"
    assert sanitize_patient_id("10003400", Settings(LANGFUSE_PATIENT_ID_MODE="none")) is None


def test_metadata_sanitizes_patient_id_without_rewriting_business_fields() -> None:
    settings = Settings(LANGFUSE_CAPTURE_CONTENT=False)

    payload = sanitize_metadata(
        {
            "patient_id": "P001",
            "message": "raw doctor question",
            "selected_intent": "patient_summary",
            "recent_vitals": [{"heart_rate": 140}],
        },
        settings,
    )

    assert payload["patient_id"] != "P001"
    assert payload["message"] == "raw doctor question"
    assert payload["recent_vitals"] == [{"heart_rate": 140}]
    assert payload["selected_intent"] == "patient_summary"


def test_maybe_capture_content_uses_hash_when_content_capture_disabled() -> None:
    payload = maybe_capture_content("sensitive prompt", Settings(LANGFUSE_CAPTURE_CONTENT=False))

    assert payload["content_length"] == len("sensitive prompt")
    assert "content_sha256" in payload
    assert "sensitive prompt" not in payload.values()


def test_maybe_capture_content_allows_marked_safe_output_when_content_capture_disabled() -> None:
    payload = maybe_capture_content(
        {
            "_langfuse_safe_output": True,
            "selected_intent": "patient_lookup",
            "route": "tool",
            "tool_name": "clinical.patient_search_context",
        },
        Settings(LANGFUSE_CAPTURE_CONTENT=False),
    )

    assert payload == {
        "selected_intent": "patient_lookup",
        "route": "tool",
        "tool_name": "clinical.patient_search_context",
    }


def test_recording_tracer_records_span_and_is_test_configurable() -> None:
    tracer = RecordingTracer(Settings(LANGFUSE_CAPTURE_CONTENT=False))
    configure_tracer_for_testing(tracer)
    try:
        with observe(name="test.span", metadata={"patient_id": "P001"}, input="hello") as span:
            span.update(metadata={"status": "ok"}, output="world")
    finally:
        reset_tracer_for_testing()

    assert tracer.records[0]["name"] == "test.span"
    assert tracer.records[0]["metadata"]["status"] == "ok"
    assert tracer.records[0]["metadata"]["patient_id"] != "P001"
    assert tracer.records[0]["input"]["content_length"] == 5
    assert tracer.records[0]["output"]["content_length"] == 5


def test_observe_does_not_swallow_business_exception() -> None:
    tracer = RecordingTracer(Settings(LANGFUSE_CAPTURE_CONTENT=False))
    configure_tracer_for_testing(tracer)
    try:
        with pytest.raises(RuntimeError):
            with observe(name="test.error"):
                raise RuntimeError("boom")
    finally:
        reset_tracer_for_testing()
