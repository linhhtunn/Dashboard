import pytest
from pydantic import ValidationError

from app.api.schemas.agent_requests import ChatRequest, SummaryRequest


def test_summary_request_requires_patient_id() -> None:
    with pytest.raises(ValidationError):
        SummaryRequest.model_validate({})


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

