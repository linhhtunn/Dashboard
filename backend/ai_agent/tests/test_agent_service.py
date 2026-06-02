import json

import pytest

from app.llm_client import LLMConfigurationError, LLMResponse
from app.schemas import ChatRequest, ExplainAlertRequest, ResponseType, SummaryRequest
from app.services.agent_service import AgentService


def contract_payload(
    *,
    response_type: str = "summary",
    patient_id: str = "P001",
    source_id: str = "P001",
) -> dict:
    return {
        "schema_version": "v1",
        "response_type": response_type,
        "patient_id": patient_id,
        "source_id": source_id,
        "generated_at": "2000-01-01T00:00:00Z",
        "narrative_summary": "This is clinical decision support; clinician review is recommended.",
        "visualizations": {
            "has_chart": True,
            "chart_type": "time-series",
            "chart_title": "Heart rate trend",
            "data_points": [
                {
                    "timestamp": "2026-05-28T10:04:55Z",
                    "metric": "heart_rate",
                    "value": 78,
                    "unit": "bpm",
                    "status": "NORMAL",
                }
            ],
        },
        "comparisons": {
            "has_comparison": False,
            "comparison_type": "vitals-trend",
            "headers": [],
            "rows": [],
        },
    }


class FakeLLM:
    def __init__(self, outputs: list[str] | None = None, error: Exception | None = None) -> None:
        self.outputs = outputs or []
        self.error = error
        self.calls = 0

    async def generate_text(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
    ) -> LLMResponse:
        self.calls += 1
        if self.error is not None:
            raise self.error
        content = self.outputs[min(self.calls - 1, len(self.outputs) - 1)]
        return LLMResponse(content=content, model="fake", latency_ms=1.0)


@pytest.mark.asyncio
async def test_summary_service_returns_valid_llm_response() -> None:
    service = AgentService(
        FakeLLM([json.dumps(contract_payload(response_type="summary", source_id="P001"))])
    )

    response = await service.summarize_patient(SummaryRequest(patient_id="P001"))

    assert response.response_type == ResponseType.SUMMARY
    assert response.patient_id == "P001"
    assert response.source_id == "P001"


@pytest.mark.asyncio
async def test_explain_alert_service_normalizes_response_source_id() -> None:
    service = AgentService(
        FakeLLM(
            [
                json.dumps(
                    contract_payload(
                        response_type="summary",
                        patient_id="WRONG",
                        source_id="WRONG",
                    )
                )
            ]
        )
    )

    response = await service.explain_alert(ExplainAlertRequest(alert_id="ALT_FALL_0092"))

    assert response.response_type == ResponseType.EXPLAIN_ALERT
    assert response.patient_id == "P001"
    assert response.source_id == "ALT_FALL_0092"


@pytest.mark.asyncio
async def test_chat_service_uses_conversation_id_as_source_id() -> None:
    service = AgentService(
        FakeLLM([json.dumps(contract_payload(response_type="chat", source_id="CONV_P001_001"))])
    )

    response = await service.chat(
        ChatRequest(
            patient_id="P001",
            conversation_id="CONV_P001_001",
            message="Nhip tim gan day ra sao?",
        )
    )

    assert response.response_type == ResponseType.CHAT
    assert response.source_id == "CONV_P001_001"


@pytest.mark.asyncio
async def test_service_falls_back_when_llm_returns_malformed_json() -> None:
    service = AgentService(FakeLLM(["not json", "still not json"]))

    response = await service.summarize_patient(SummaryRequest(patient_id="P001"))

    assert response.response_type == ResponseType.SUMMARY
    assert response.visualizations.has_chart is False


@pytest.mark.asyncio
async def test_service_falls_back_when_llm_configuration_is_missing() -> None:
    service = AgentService(FakeLLM(error=LLMConfigurationError("OPENAI_API_KEY is required")))

    response = await service.summarize_patient(SummaryRequest(patient_id="P001"))

    assert response.response_type == ResponseType.SUMMARY
    assert response.visualizations.has_chart is False


@pytest.mark.asyncio
async def test_service_falls_back_for_unknown_fixtures() -> None:
    service = AgentService(FakeLLM([json.dumps(contract_payload())]))

    summary = await service.summarize_patient(SummaryRequest(patient_id="NO_SUCH_PATIENT"))
    explain = await service.explain_alert(ExplainAlertRequest(alert_id="NO_SUCH_ALERT"))

    assert summary.response_type == ResponseType.SUMMARY
    assert explain.response_type == ResponseType.EXPLAIN_ALERT
