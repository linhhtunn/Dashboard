from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass

from pydantic import ValidationError

from app.agents.clinical.prompts.templates import SYSTEM_PROMPT
from app.contracts.agent_response import AgentResponse, ResponseType, validate_agent_response
from app.infrastructure.llm.ports import LLMConfigurationError, LLMProvider
from app.infrastructure.resilience import run_with_llm_retry, run_with_repair_retry
from app.services.safety import check_clinical_safety
from app.services.parsers.agent_response_parser import LLMOutputParseError, parse_agent_response

logger = logging.getLogger(__name__)


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
        expected_patient_id: str,
        expected_source_id: str,
        fallback: Callable[[str], AgentResponse],
        log_fallback: Callable[..., AgentResponse],
    ) -> GenerationResult:
        raw_text: str | None = None

        async def generate() -> str:
            response = await self.llm_provider.generate_text(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=user_prompt,
            )
            return response.content

        async def parse_or_repair(attempt: int, last_error: Exception | None) -> AgentResponse:
            nonlocal raw_text
            if attempt == 1:
                raw_text = await run_with_llm_retry(generate)
            else:
                repair_prompt = (
                    f"{user_prompt}\n\n"
                    "Lan tra loi truoc khong dat Contract 6 JSON. "
                    f"Loi: {last_error}. Hay tra ve lai dung mot JSON object hop le."
                )
                response = await self.llm_provider.generate_text(
                    system_prompt=SYSTEM_PROMPT,
                    user_prompt=repair_prompt,
                )
                raw_text = response.content
            parsed = parse_agent_response(raw_text)
            logger.info(
                "llm_response_parsed_successfully response_type=%s patient_id=%s source_id=%s",
                parsed.response_type.value,
                parsed.patient_id,
                parsed.source_id,
            )
            return self._normalize_response(
                parsed,
                response_type=expected_response_type,
                patient_id=expected_patient_id,
                source_id=expected_source_id,
            )

        repair_fallback_used = False

        def repair_fallback(exc: Exception) -> AgentResponse:
            nonlocal repair_fallback_used
            repair_fallback_used = True
            return log_fallback(
                endpoint=expected_response_type.value,
                response=fallback("LLM output khong dat Contract 6 sau khi repair retry."),
                patient_id=expected_patient_id,
                reason=f"LLM output khong dat Contract 6 sau khi repair retry: {exc}",
            )

        try:
            response = await run_with_repair_retry(
                parse_or_repair,
                fallback=repair_fallback,
            )
        except (LLMConfigurationError, TimeoutError, ConnectionError, LLMOutputParseError, ValidationError):
            return GenerationResult(
                response=log_fallback(
                    endpoint=expected_response_type.value,
                    response=fallback("Khong the tao phan hoi an toan tu LLM trong luc nay."),
                    patient_id=expected_patient_id,
                    reason="Khong the tao phan hoi an toan tu LLM trong luc nay.",
                ),
                safe_for_memory=False,
            )
        if repair_fallback_used:
            return GenerationResult(response=response, safe_for_memory=False)

        clinical_safety = check_clinical_safety(response)
        if not clinical_safety.safe:
            return GenerationResult(
                response=log_fallback(
                    endpoint=expected_response_type.value,
                    response=fallback(clinical_safety.reason),
                    patient_id=expected_patient_id,
                    reason=clinical_safety.reason,
                ),
                safe_for_memory=False,
            )
        return GenerationResult(response=response, safe_for_memory=True)

    def _normalize_response(
        self,
        response: AgentResponse,
        *,
        response_type: ResponseType,
        patient_id: str,
        source_id: str,
    ) -> AgentResponse:
        payload = response.model_dump(mode="json")
        payload["schema_version"] = "v1"
        payload["response_type"] = response_type.value
        payload["patient_id"] = patient_id
        payload["source_id"] = source_id
        return validate_agent_response(payload)
