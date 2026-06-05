from app.fixtures.clinical import get_alert_fixture, get_patient_fixture
from app.api.schemas.agent_requests import ChatRequest
from app.agents.clinical.prompts.builders import (
    build_chat_prompt,
    build_explain_alert_prompt,
    build_summary_prompt,
)


def test_summary_prompt_includes_patient_fixture_and_contract_targets() -> None:
    prompt = build_summary_prompt(get_patient_fixture("P001"))

    assert "P001" in prompt
    assert "`response_type` phai la `summary`" in prompt
    assert "`source_id` phai la `P001`" in prompt
    assert "recent" not in prompt.lower()


def test_explain_alert_prompt_includes_alert_fixture_and_contract_targets() -> None:
    alert = get_alert_fixture("ALT_FALL_0092")
    patient = get_patient_fixture(alert["patient_id"])

    prompt = build_explain_alert_prompt(alert, patient)

    assert "ALT_FALL_0092" in prompt
    assert "`response_type` phai la `explain-alert`" in prompt
    assert "`source_id` phai la `ALT_FALL_0092`" in prompt


def test_chat_prompt_includes_message_and_contract_targets() -> None:
    request = ChatRequest.model_validate(
        {
            "patient_id": "P001",
            "conversation_id": "CONV_P001_001",
            "message": "Nhip tim gan day ra sao?",
        }
    )

    prompt = build_chat_prompt(
        patient=get_patient_fixture("P001"),
        message=request.message,
        conversation_id=request.conversation_id,
    )

    assert "CONV_P001_001" in prompt
    assert "Nhip tim gan day ra sao?" in prompt
    assert "`response_type` phai la `chat`" in prompt
