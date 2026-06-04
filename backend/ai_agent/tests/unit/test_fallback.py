from app.services.fallback import (
    build_chat_fallback,
    build_explain_alert_fallback,
    build_summary_fallback,
)
from app.contracts.agent_response import ResponseType, validate_agent_response


def test_chat_fallback_uses_conversation_id_as_source_id() -> None:
    response = build_chat_fallback(patient_id="patient-123", conversation_id="conversation-456")

    validated = validate_agent_response(response.model_dump())

    assert validated.response_type == ResponseType.CHAT
    assert validated.source_id == "conversation-456"
    assert validated.visualizations.has_chart is False


def test_chat_fallback_uses_patient_id_when_conversation_id_is_missing() -> None:
    response = build_chat_fallback(patient_id="patient-123")

    assert response.source_id == "patient-123"


def test_summary_fallback_uses_patient_id_as_source_id() -> None:
    response = build_summary_fallback(patient_id="patient-123")

    validated = validate_agent_response(response.model_dump())

    assert validated.response_type == ResponseType.SUMMARY
    assert validated.source_id == "patient-123"


def test_explain_alert_fallback_preserves_alert_id_as_source_id() -> None:
    response = build_explain_alert_fallback(patient_id="patient-123", alert_id="alert-789")

    validated = validate_agent_response(response.model_dump())

    assert validated.response_type == ResponseType.EXPLAIN_ALERT
    assert validated.source_id == "alert-789"
    assert validated.comparisons.rows == []
