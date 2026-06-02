import pytest
from pydantic import ValidationError

from app.schemas import ChatRequest, SummaryRequest


def test_summary_request_requires_patient_id() -> None:
    with pytest.raises(ValidationError):
        SummaryRequest.model_validate({})


def test_chat_request_accepts_valid_history_roles() -> None:
    request = ChatRequest.model_validate(
        {
            "patient_id": "P001",
            "message": "Summarize recent vitals.",
            "history": [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "How can I help?"},
            ],
        }
    )

    assert len(request.history) == 2


def test_chat_request_rejects_invalid_history_role() -> None:
    with pytest.raises(ValidationError):
        ChatRequest.model_validate(
            {
                "patient_id": "P001",
                "message": "Summarize recent vitals.",
                "history": [{"role": "doctor", "content": "Hello"}],
            }
        )
