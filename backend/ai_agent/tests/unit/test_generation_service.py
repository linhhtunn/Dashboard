import json

import pytest

from app.contracts.agent_response import AgentResponse, ResponseType
from app.core.config import Settings
from app.infrastructure.llm.ports import LLMResponse, LLMStreamChunk
from app.observability import RecordingTracer, configure_tracer_for_testing, reset_tracer_for_testing
from app.services.fallback import build_chat_fallback
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
        expected_response_type=ResponseType.CHAT,
        expected_patient_id="P001",
        expected_source_id="P001",
        fallback=lambda reason: build_chat_fallback(patient_id="P001", reason=reason),
        log_fallback=log_fallback(fallback_calls),
    )

    assert result.safe_for_memory is True
    assert result.response.response_type == ResponseType.CHAT
    assert result.response.patient_id == "P001"
    assert result.response.source_id == "P001"
    assert fallback_calls == []


@pytest.mark.asyncio
async def test_generation_service_falls_back_after_repair_exhaustion() -> None:
    service = GenerationService(FakeLLM(["not json", "still not json"]))
    fallback_calls: list[dict] = []

    result = await service.generate_with_contract(
        user_prompt="prompt",
        expected_response_type=ResponseType.CHAT,
        expected_patient_id="P001",
        expected_source_id="P001",
        fallback=lambda reason: build_chat_fallback(patient_id="P001", reason=reason),
        log_fallback=log_fallback(fallback_calls),
    )

    assert result.safe_for_memory is False
    assert result.response.response_type == ResponseType.CHAT
    assert result.response.visualizations.has_chart is False
    assert fallback_calls[0]["endpoint"] == "chat"


@pytest.mark.asyncio
async def test_generation_service_records_llm_call_trace() -> None:
    tracer = RecordingTracer(Settings(LANGFUSE_CAPTURE_CONTENT=False))
    configure_tracer_for_testing(tracer)
    try:
        service = GenerationService(
            FakeLLM([json.dumps(contract_payload(response_type="chat", patient_id="P001", source_id="P001"))])
        )
        await service.generate_with_contract(
            user_prompt="prompt",
            expected_response_type=ResponseType.CHAT,
            expected_patient_id="P001",
            expected_source_id="P001",
            fallback=lambda reason: build_chat_fallback(patient_id="P001", reason=reason),
            log_fallback=log_fallback([]),
        )
    finally:
        reset_tracer_for_testing()

    record = next(record for record in tracer.records if record["name"] == "generation.chat_contract")
    assert record["as_type"] == "generation"
    assert record["metadata"]["patient_id"] != "P001"
    assert record["metadata"]["output_length"] > 0
    assert record["metadata"]["latency_ms"] == 1.0
    assert record["usage_details"] == {"input": 10, "output": 20, "total": 30}
    assert record["model"] == "fake"


class FakeStreamingLLM:
    async def generate_text(self, *, system_prompt: str, user_prompt: str, temperature: float = 0.2):
        return LLMResponse(content="{}", model="fake-stream", latency_ms=1.0)

    async def generate_text_stream(self, *, system_prompt: str, user_prompt: str, temperature: float = 0.2):
        yield LLMStreamChunk(content='{"schema_version":"v1","response_type":"chat","patient_id":"P001",')
        yield LLMStreamChunk(content='"source_id":"P001","narrative_summary":"ok"}')
        yield LLMStreamChunk(model="fake-stream", prompt_tokens=11, completion_tokens=22, total_tokens=33)


@pytest.mark.asyncio
async def test_generation_service_records_stream_usage_trace() -> None:
    tracer = RecordingTracer(Settings(LANGFUSE_CAPTURE_CONTENT=False))
    configure_tracer_for_testing(tracer)
    try:
        service = GenerationService(FakeStreamingLLM())
        events = [
            event
            async for event in service.generate_with_contract_stream(
                user_prompt="prompt",
                expected_response_type=ResponseType.CHAT,
                expected_patient_id="P001",
                expected_source_id="P001",
                fallback=lambda reason: build_chat_fallback(patient_id="P001", reason=reason),
                log_fallback=log_fallback([]),
            )
        ]
    finally:
        reset_tracer_for_testing()

    assert events[-1][0] == "result"
    record = next(record for record in tracer.records if record["name"] == "generation.chat_contract_stream")
    assert record["as_type"] == "generation"
    assert isinstance(record["metadata"]["latency_ms"], float)
    assert record["usage_details"] == {"input": 11, "output": 22, "total": 33}
    assert record["model"] == "fake-stream"
