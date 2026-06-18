from app.api.schemas.agent_requests import ChatRequest


def test_chat_request_allows_doctor_scoped_message_without_patient_id() -> None:
    request = ChatRequest.model_validate({"message": "Hôm nay bệnh nhân nào cần theo dõi?"})

    assert request.patient_id is None
    assert request.message == "Hôm nay bệnh nhân nào cần theo dõi?"


def test_chat_request_valid() -> None:
    request = ChatRequest.model_validate(
        {
            "patient_id": "P001",
            "message": "Summarize recent vitals.",
        }
    )
    assert request.patient_id == "P001"
    assert request.message == "Summarize recent vitals."
    assert request.conversation_id is None


def test_chat_request_accepts_nested_metadata_for_sanitizer() -> None:
    request = ChatRequest.model_validate(
        {
            "patient_id": "P001",
            "message": "Summarize recent vitals.",
            "metadata": {
                "alert_id": "ALT_1",
                "db_context": {"patient": {"id": "P001"}},
            },
        }
    )

    assert request.metadata["alert_id"] == "ALT_1"
    assert isinstance(request.metadata["db_context"], dict)
