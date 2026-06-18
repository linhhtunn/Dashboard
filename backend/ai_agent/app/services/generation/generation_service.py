from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass
from time import perf_counter

from pydantic import ValidationError

from app.agents.clinical.prompts.templates import SYSTEM_PROMPT
from app.contracts.agent_response import AgentResponse, ResponseType, validate_agent_response
from app.infrastructure.llm.ports import LLMConfigurationError, LLMProvider
from app.infrastructure.resilience import run_with_llm_retry, run_with_repair_retry
from app.observability import observe
from app.services.safety import check_clinical_safety
from app.services.parsers.agent_response_parser import LLMOutputParseError, parse_agent_response

logger = logging.getLogger(__name__)


class IncrementalNarrativeExtractor:
    def __init__(self) -> None:
        self.buffer = ""
        self.in_summary = False
        self.last_length = 0

    def feed(self, chunk: str) -> str:
        self.buffer += chunk
        if not self.in_summary:
            idx = self.buffer.find('"narrative_summary":')
            if idx != -1:
                start_val = self.buffer.find('"', idx + len('"narrative_summary":'))
                if start_val != -1:
                    self.in_summary = True
                    self.buffer = self.buffer[start_val + 1:]
                    self.last_length = 0

        if self.in_summary:
            end_idx = -1
            for i in range(len(self.buffer)):
                if self.buffer[i] == '"':
                    escaped = False
                    j = i - 1
                    while j >= 0 and self.buffer[j] == '\\':
                        escaped = not escaped
                        j -= 1
                    if not escaped:
                        end_idx = i
                        break
            
            if end_idx != -1:
                summary_str = self.buffer[:end_idx]
                summary_str = (
                    summary_str.replace('\\n', '\n')
                    .replace('\\t', '\t')
                    .replace('\\"', '"')
                    .replace('\\\\', '\\')
                )
                diff = summary_str[self.last_length:]
                self.last_length = len(summary_str)
                self.in_summary = False
                return diff
            else:
                length_to_process = len(self.buffer)
                if self.buffer.endswith('\\'):
                    length_to_process -= 1
                
                summary_str = self.buffer[:length_to_process]
                summary_str = (
                    summary_str.replace('\\n', '\n')
                    .replace('\\t', '\t')
                    .replace('\\"', '"')
                    .replace('\\\\', '\\')
                )
                diff = summary_str[self.last_length:]
                self.last_length = len(summary_str)
                return diff
        return ""


@dataclass(frozen=True)
class GenerationResult:
    response: AgentResponse
    safe_for_memory: bool


@dataclass(frozen=True)
class GenerationService:
    llm_provider: LLMProvider

    async def generate_with_contract(
        self,
        *,
        user_prompt: str,
        expected_response_type: ResponseType,
        expected_patient_id: str | None,
        expected_source_id: str,
        fallback: Callable[[str], AgentResponse],
        log_fallback: Callable[..., AgentResponse],
    ) -> GenerationResult:
        try:
            with observe(
                name="generation.chat_contract",
                as_type="generation",
                metadata={
                    "expected_response_type": expected_response_type.value,
                    "patient_id": expected_patient_id,
                    "expected_source_id": expected_source_id,
                    "streaming": False,
                },
                input=user_prompt,
            ) as span:
                started_at = perf_counter()
                response = await self.llm_provider.generate_text(
                    system_prompt=SYSTEM_PROMPT,
                    user_prompt=user_prompt,
                )
                latency_ms = getattr(response, "latency_ms", None) or _elapsed_ms(started_at)
                span.update(
                    model=getattr(response, "model", None),
                    metadata={
                        "model": getattr(response, "model", None),
                        "output_length": len(response.content or ""),
                        "latency_ms": latency_ms,
                    },
                    usage_details=_usage_details_from_response(response),
                    output=response.content,
                )
            content = response.content
            
            safe_for_memory = True
            from app.services.parsers.agent_response_parser import parse_json_object, normalize_and_repair_payload
            try:
                payload = parse_json_object(content)
                payload = normalize_and_repair_payload(payload)
                normalized_resp = self._normalize_response(
                    payload,
                    response_type=expected_response_type,
                    patient_id=expected_patient_id,
                    source_id=expected_source_id,
                )
                return GenerationResult(response=normalized_resp, safe_for_memory=True)
            except Exception as e:
                degraded_payload = {
                    "schema_version": "v1",
                    "response_type": expected_response_type.value,
                    "patient_id": expected_patient_id,
                    "source_id": expected_source_id,
                    "narrative_summary": content or "Không thể phân tích phản hồi lâm sàng.",
                    "visualizations": {
                        "has_chart": False,
                        "chart_type": "time-series",
                        "chart_title": "",
                        "data_points": []
                    },
                    "comparisons": {
                        "has_comparison": False,
                        "comparison_type": "vitals-trend",
                        "headers": [],
                        "rows": []
                    }
                }
                degraded_resp = validate_agent_response(degraded_payload)
                normalized_resp = log_fallback(
                    endpoint="chat",
                    response=degraded_resp,
                    patient_id=expected_patient_id,
                    reason=f"Failed to parse LLM JSON: {e}",
                )
                return GenerationResult(response=normalized_resp, safe_for_memory=False)
        except Exception as exc:
            logger.error("Failed to generate response: %s", exc)
            degraded_payload = {
                "schema_version": "v1",
                "response_type": expected_response_type.value,
                "patient_id": expected_patient_id,
                "source_id": expected_source_id,
                "narrative_summary": "Lỗi hệ thống khi tạo câu trả lời.",
                "visualizations": {
                    "has_chart": False,
                    "chart_type": "time-series",
                    "chart_title": "",
                    "data_points": []
                },
                "comparisons": {
                    "has_comparison": False,
                    "comparison_type": "vitals-trend",
                    "headers": [],
                    "rows": []
                }
            }
            return GenerationResult(
                response=validate_agent_response(degraded_payload),
                safe_for_memory=False,
            )

    async def generate_with_contract_stream(
        self,
        *,
        user_prompt: str,
        expected_response_type: ResponseType,
        expected_patient_id: str | None,
        expected_source_id: str,
        fallback: Callable[[str], AgentResponse],
        log_fallback: Callable[..., AgentResponse],
    ):
        extractor = IncrementalNarrativeExtractor()
        raw_text = ""
        streamed_text = ""
        try:
            with observe(
                name="generation.chat_contract_stream",
                as_type="generation",
                metadata={
                    "expected_response_type": expected_response_type.value,
                    "patient_id": expected_patient_id,
                    "expected_source_id": expected_source_id,
                    "streaming": True,
                },
                input=user_prompt,
            ) as span:
                stream_usage = None
                stream_model = None
                started_at = perf_counter()
                async for chunk in self.llm_provider.generate_text_stream(
                    system_prompt=SYSTEM_PROMPT,
                    user_prompt=user_prompt,
                ):
                    if not isinstance(chunk, str):
                        stream_model = getattr(chunk, "model", stream_model) or stream_model
                        usage = _usage_details_from_response(chunk)
                        if usage:
                            stream_usage = usage
                        chunk = getattr(chunk, "content", "")
                    raw_text += chunk
                    diff = extractor.feed(chunk)
                    if diff:
                        streamed_text += diff
                        yield "token", diff
                span.update(
                    model=stream_model,
                    metadata={
                        "model": stream_model,
                        "output_length": len(raw_text),
                        "latency_ms": _elapsed_ms(started_at),
                    },
                    usage_details=stream_usage,
                    output=raw_text,
                )
        except Exception as exc:
            logger.error("LLM streaming failed: %s", exc, exc_info=True)
            degraded_payload = {
                "schema_version": "v1",
                "response_type": expected_response_type.value,
                "patient_id": expected_patient_id,
                "source_id": expected_source_id,
                "narrative_summary": streamed_text or "Lỗi kết nối LLM trong lúc stream.",
                "visualizations": {
                    "has_chart": False,
                    "chart_type": "time-series",
                    "chart_title": "",
                    "data_points": []
                },
                "comparisons": {
                    "has_comparison": False,
                    "comparison_type": "vitals-trend",
                    "headers": [],
                    "rows": []
                }
            }
            yield "result", validate_agent_response(degraded_payload)
            return

        try:
            from app.services.parsers.agent_response_parser import parse_json_object, normalize_and_repair_payload
            try:
                payload = parse_json_object(raw_text)
            except Exception:
                payload = {"narrative_summary": raw_text}
                
            payload = normalize_and_repair_payload(payload)
            final_resp = self._normalize_response(
                payload,
                response_type=expected_response_type,
                patient_id=expected_patient_id,
                source_id=expected_source_id,
            )
        except Exception as exc:
            logger.warning("Stream parsing failed, falling back to graceful degradation: %s", exc)
            from datetime import datetime, UTC
            degraded_payload = {
                "schema_version": "v1",
                "response_type": expected_response_type.value,
                "patient_id": expected_patient_id,
                "source_id": expected_source_id,
                "generated_at": datetime.now(UTC).isoformat(),
                "narrative_summary": streamed_text or raw_text or "Không thể phân tích phản hồi lâm sàng.",
                "visualizations": {
                    "has_chart": False,
                    "chart_type": "time-series",
                    "chart_title": "",
                    "data_points": []
                },
                "comparisons": {
                    "has_comparison": False,
                    "comparison_type": "vitals-trend",
                    "headers": [],
                    "rows": []
                }
            }
            final_resp = validate_agent_response(degraded_payload)

        yield "result", final_resp

    def _normalize_response(
        self,
        payload: dict[str, Any],
        *,
        response_type: ResponseType,
        patient_id: str | None,
        source_id: str,
    ) -> AgentResponse:
        payload["schema_version"] = "v1"
        payload["response_type"] = response_type.value
        payload["patient_id"] = patient_id
        payload["source_id"] = source_id
        return validate_agent_response(payload)


def _usage_details_from_response(response) -> dict[str, int] | None:
    usage = {
        "input": getattr(response, "prompt_tokens", None),
        "output": getattr(response, "completion_tokens", None),
        "total": getattr(response, "total_tokens", None),
    }
    return {key: value for key, value in usage.items() if value is not None} or None


def _elapsed_ms(started_at: float) -> float:
    return round((perf_counter() - started_at) * 1000, 2)
