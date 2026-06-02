from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol

from pydantic import ValidationError

from app import prompts
from app.fallback import (
    build_chat_fallback,
    build_explain_alert_fallback,
    build_summary_fallback,
)
from app.fixtures.clinical import FixtureNotFoundError, get_alert_fixture, get_patient_fixture
from app.llm_client import LLMConfigurationError, LLMResponse, OpenAILLMClient
from app.output_parser import LLMOutputParseError, parse_agent_response
from app.retry import run_with_llm_retry, run_with_repair_retry
from app.safety import PromptSafetyDecision, check_clinical_safety, classify_prompt_injection
from app.schemas import (
    AgentResponse,
    ChatRequest,
    ExplainAlertRequest,
    ResponseType,
    SummaryRequest,
    validate_agent_response,
)
from app.services.prompt_builder import (
    build_chat_prompt,
    build_explain_alert_prompt,
    build_summary_prompt,
)

logger = logging.getLogger(__name__)


class LLMClientProtocol(Protocol):
    async def generate_text(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
    ) -> LLMResponse:
        ...


@dataclass(frozen=True)
class AgentService:
    llm_client: LLMClientProtocol

    async def summarize_patient(self, request: SummaryRequest) -> AgentResponse:
        try:
            patient = get_patient_fixture(request.patient_id)
        except FixtureNotFoundError:
            return self._log_and_return_fallback(
                endpoint="summary",
                response=build_summary_fallback(
                    patient_id=request.patient_id,
                    reason="Khong tim thay mock patient fixture cho patient_id nay.",
                ),
                patient_id=request.patient_id,
                reason="Khong tim thay mock patient fixture cho patient_id nay.",
            )

        prompt = build_summary_prompt(patient)
        return await self._generate_with_contract(
            user_prompt=prompt,
            expected_response_type=ResponseType.SUMMARY,
            expected_patient_id=request.patient_id,
            expected_source_id=request.patient_id,
            fallback=lambda reason: build_summary_fallback(
                patient_id=request.patient_id,
                reason=reason,
            ),
        )

    async def explain_alert(self, request: ExplainAlertRequest) -> AgentResponse:
        try:
            alert = get_alert_fixture(request.alert_id)
            patient = get_patient_fixture(alert["patient_id"])
        except FixtureNotFoundError:
            return self._log_and_return_fallback(
                endpoint="explain-alert",
                response=build_explain_alert_fallback(
                    patient_id="UNKNOWN",
                    alert_id=request.alert_id,
                    reason="Khong tim thay mock alert fixture cho alert_id nay.",
                ),
                patient_id="UNKNOWN",
                reason="Khong tim thay mock alert fixture cho alert_id nay.",
            )

        prompt = build_explain_alert_prompt(alert, patient)
        return await self._generate_with_contract(
            user_prompt=prompt,
            expected_response_type=ResponseType.EXPLAIN_ALERT,
            expected_patient_id=patient["patient_id"],
            expected_source_id=request.alert_id,
            fallback=lambda reason: build_explain_alert_fallback(
                patient_id=patient["patient_id"],
                alert_id=request.alert_id,
                reason=reason,
            ),
        )

    async def chat(self, request: ChatRequest) -> AgentResponse:
        safety = classify_prompt_injection(request.message)
        logger.info(
            "safety_gateway_decision endpoint=chat decision=%s matched_rules=%s",
            safety.decision.value,
            ",".join(safety.matched_rules) if safety.matched_rules else "none",
        )
        if safety.decision == PromptSafetyDecision.BLOCK:
            return self._log_and_return_fallback(
                endpoint="chat",
                response=build_chat_fallback(
                    patient_id=request.patient_id,
                    conversation_id=request.conversation_id,
                    reason=safety.reason,
                ),
                patient_id=request.patient_id,
                reason=safety.reason,
            )

        try:
            patient = get_patient_fixture(request.patient_id)
        except FixtureNotFoundError:
            return self._log_and_return_fallback(
                endpoint="chat",
                response=build_chat_fallback(
                    patient_id=request.patient_id,
                    conversation_id=request.conversation_id,
                    reason="Khong tim thay mock patient fixture cho patient_id nay.",
                ),
                patient_id=request.patient_id,
                reason="Khong tim thay mock patient fixture cho patient_id nay.",
            )

        prompt = build_chat_prompt(
            patient=patient,
            message=request.message,
            history=request.history,
            conversation_id=request.conversation_id,
        )
        source_id = request.conversation_id or request.patient_id
        return await self._generate_with_contract(
            user_prompt=prompt,
            expected_response_type=ResponseType.CHAT,
            expected_patient_id=request.patient_id,
            expected_source_id=source_id,
            fallback=lambda reason: build_chat_fallback(
                patient_id=request.patient_id,
                conversation_id=request.conversation_id,
                reason=reason,
            ),
        )

    async def _generate_with_contract(
        self,
        *,
        user_prompt: str,
        expected_response_type: ResponseType,
        expected_patient_id: str,
        expected_source_id: str,
        fallback: Callable[[str], AgentResponse],
    ) -> AgentResponse:
        raw_text: str | None = None

        async def generate() -> str:
            response = await self.llm_client.generate_text(
                system_prompt=prompts.SYSTEM_PROMPT,
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
                response = await self.llm_client.generate_text(
                    system_prompt=prompts.SYSTEM_PROMPT,
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

        try:
            response = await run_with_repair_retry(
                parse_or_repair,
                fallback=lambda exc: fallback("LLM output khong dat Contract 6 sau khi repair retry."),
            )
        except (LLMConfigurationError, TimeoutError, ConnectionError, LLMOutputParseError, ValidationError):
            return self._log_and_return_fallback(
                endpoint=expected_response_type.value,
                response=fallback("Khong the tao phan hoi an toan tu LLM trong luc nay."),
                patient_id=expected_patient_id,
                reason="Khong the tao phan hoi an toan tu LLM trong luc nay.",
            )

        clinical_safety = check_clinical_safety(response)
        if not clinical_safety.safe:
            return self._log_and_return_fallback(
                endpoint=expected_response_type.value,
                response=fallback(clinical_safety.reason),
                patient_id=expected_patient_id,
                reason=clinical_safety.reason,
            )
        return response

    def _log_and_return_fallback(
        self,
        *,
        endpoint: str,
        response: AgentResponse,
        patient_id: str,
        reason: str,
    ) -> AgentResponse:
        logger.warning(
            "agent_fallback_used endpoint=%s response_type=%s patient_id=%s source_id=%s reason=%s",
            endpoint,
            response.response_type.value,
            patient_id,
            response.source_id,
            reason,
        )
        return response

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


def create_agent_service() -> AgentService:
    return AgentService(llm_client=OpenAILLMClient())
