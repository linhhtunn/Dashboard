import json

import pytest

from app.contracts.agent_response import AgentResponse, ResponseType
from app.services.fallback import build_summary_fallback
from app.services.generation import GenerationService
from tests.workflow.test_agent_service import FakeLLM, contract_payload


def log_fallback(
    calls: list[dict],
):
    def _log_fallback(
        *,
        endpoint: str,
        response: AgentResponse,
        patient_id: str,
        reason: str,
    ) -> AgentResponse:
        calls.append(
            {
                "endpoint": endpoint,
                "patient_id": patient_id,
                "reason": reason,
            }
        )
        return response

    return _log_fallback


@pytest.mark.asyncio
async def test_generation_service_normalizes_contract_fields() -> None:
    service = GenerationService(
        FakeLLM(
            [
                json.dumps(
                    contract_payload(
                        response_type="chat",
                        patient_id="WRONG",
                        source_id="WRONG",
                    )
                )
            ]
        )
    )
    fallback_calls: list[dict] = []

    result = await service.generate_with_contract(
        user_prompt="prompt",
        expected_response_type=ResponseType.SUMMARY,
        expected_patient_id="P001",
        expected_source_id="P001",
        fallback=lambda reason: build_summary_fallback(patient_id="P001", reason=reason),
        log_fallback=log_fallback(fallback_calls),
    )

    assert result.safe_for_memory is True
    assert result.response.response_type == ResponseType.SUMMARY
    assert result.response.patient_id == "P001"
    assert result.response.source_id == "P001"
    assert fallback_calls == []


@pytest.mark.asyncio
async def test_generation_service_falls_back_after_repair_exhaustion() -> None:
    service = GenerationService(FakeLLM(["not json", "still not json"]))
    fallback_calls: list[dict] = []

    result = await service.generate_with_contract(
        user_prompt="prompt",
        expected_response_type=ResponseType.SUMMARY,
        expected_patient_id="P001",
        expected_source_id="P001",
        fallback=lambda reason: build_summary_fallback(patient_id="P001", reason=reason),
        log_fallback=log_fallback(fallback_calls),
    )

    assert result.safe_for_memory is False
    assert result.response.response_type == ResponseType.SUMMARY
    assert result.response.visualizations.has_chart is False
    assert fallback_calls[0]["endpoint"] == "summary"
