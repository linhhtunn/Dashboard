from app.fixtures.clinical import get_patient_fixture
from app.api.schemas.agent_requests import ChatRequest
from app.agents.clinical.prompts.builders import (
    build_chat_prompt,
)


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


def test_medical_search_prompt_uses_retrieved_evidence_without_raw_tool_output() -> None:
    prompt = build_chat_prompt(
        patient={"patient_id": None},
        message="Uong vitamin C lieu cao co giup chong cam cum khong?",
        conversation_id="CONV_MEDICAL_QA_001",
        selected_intent="general_medical_qa",
        retrieved_evidence=[
            "Nguồn: Vitamin C Review (URL: https://example.org/vitamin-c) - Nội dung: Vitamin C liều cao có thể gây tác dụng phụ."
        ],
        tool_output={
            "tool_name": "clinical.medical_search_tool",
            "status": "success",
            "message": "",
            "data": {
                "retrieved_evidence": [
                    "Nguồn: Vitamin C Review (URL: https://example.org/vitamin-c) - Nội dung: Vitamin C liều cao có thể gây tác dụng phụ."
                ],
                "raw_search_results": [
                    {
                        "title": "Vitamin C Review",
                        "url": "https://example.org/vitamin-c",
                        "highlights": "Raw search highlight should not be prompt context.",
                    }
                ],
            },
        },
    )

    assert "Clinical Guidelines & Safety Citations" in prompt
    assert "Vitamin C liều cao có thể gây tác dụng phụ" in prompt
    assert "Deterministic Tool Output" not in prompt
    assert "raw_search_results" not in prompt
    assert "Raw search highlight should not be prompt context" not in prompt


def test_non_medical_search_prompt_keeps_deterministic_tool_output() -> None:
    prompt = build_chat_prompt(
        patient={"patient_id": "10003400"},
        message="De xuat thuoc chong dong",
        conversation_id="CONV_MED_001",
        selected_intent="medication_recommendation",
        tool_output={
            "tool_name": "clinical.medication_recommendation_context",
            "status": "success",
            "message": "",
            "data": {
                "allowed_drugs": ["apixaban"],
                "domain_display_name": "AF Anticoagulation",
            },
        },
    )

    assert "Deterministic Tool Output" in prompt
    assert "apixaban" in prompt
    assert "Active Clinical Domain: AF Anticoagulation" in prompt
