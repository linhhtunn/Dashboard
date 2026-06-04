from __future__ import annotations

import logging
import asyncio
from collections.abc import Callable
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Protocol

from pydantic import ValidationError

from app import prompts
from app.config import get_settings
from app.fallback import (
    build_chat_fallback,
    build_explain_alert_fallback,
    build_summary_fallback,
)
from app.fixtures.clinical import FixtureNotFoundError, get_alert_fixture, get_patient_fixture
from app.llm_client import LLMConfigurationError, LLMResponse, OpenAILLMClient
from app.memory.checkpointer import (
    CheckpointerHandle,
    create_async_checkpointer,
    create_checkpointer,
)
from app.memory.policy import SlidingWindowPolicy
from app.memory.workflow import ChatGenerationResult, ChatMemoryWorkflow
from app.api.schemas.agent_requests import ChatRequest, ExplainAlertRequest, SummaryRequest
from app.contracts.agent_response import AgentResponse, ResponseType, validate_agent_response
from app.retry import run_with_llm_retry, run_with_repair_retry
from app.safety import PromptSafetyDecision, check_clinical_safety, classify_prompt_injection
from app.services.parsers.agent_response_parser import LLMOutputParseError, parse_agent_response
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
    memory_workflow: ChatMemoryWorkflow = field(default_factory=ChatMemoryWorkflow)
    checkpointer_handle: CheckpointerHandle | None = None

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

        source_id = request.conversation_id or request.patient_id

        async def generate_from_memory(memory_context: str) -> ChatGenerationResult:
            prompt = build_chat_prompt(
                patient=patient,
                message=request.message,
                history=request.history,
                conversation_id=request.conversation_id,
                memory_context=memory_context,
            )
            return await self._generate_with_contract_result(
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

        return await self.memory_workflow.run(
            patient_id=request.patient_id,
            conversation_id=source_id,
            message=request.message,
            history=request.history,
            generate_response=generate_from_memory,
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
        result = await self._generate_with_contract_result(
            user_prompt=user_prompt,
            expected_response_type=expected_response_type,
            expected_patient_id=expected_patient_id,
            expected_source_id=expected_source_id,
            fallback=fallback,
        )
        return result.response

    async def _generate_with_contract_result(
        self,
        *,
        user_prompt: str,
        expected_response_type: ResponseType,
        expected_patient_id: str,
        expected_source_id: str,
        fallback: Callable[[str], AgentResponse],
    ) -> ChatGenerationResult:
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

        repair_fallback_used = False

        def repair_fallback(exc: Exception) -> AgentResponse:
            nonlocal repair_fallback_used
            repair_fallback_used = True
            return self._log_and_return_fallback(
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
            return ChatGenerationResult(
                response=self._log_and_return_fallback(
                    endpoint=expected_response_type.value,
                    response=fallback("Khong the tao phan hoi an toan tu LLM trong luc nay."),
                    patient_id=expected_patient_id,
                    reason="Khong the tao phan hoi an toan tu LLM trong luc nay.",
                ),
                safe_for_memory=False,
            )
        if repair_fallback_used:
            return ChatGenerationResult(response=response, safe_for_memory=False)

        clinical_safety = check_clinical_safety(response)
        if not clinical_safety.safe:
            return ChatGenerationResult(
                response=self._log_and_return_fallback(
                    endpoint=expected_response_type.value,
                    response=fallback(clinical_safety.reason),
                    patient_id=expected_patient_id,
                    reason=clinical_safety.reason,
                ),
                safe_for_memory=False,
            )
        return ChatGenerationResult(response=response, safe_for_memory=True)

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


@lru_cache
def create_agent_service() -> AgentService:
    settings = get_settings()
    try:
        checkpointer_handle = create_checkpointer(settings)
        memory_workflow = ChatMemoryWorkflow(
            policy=SlidingWindowPolicy(
                compact_turn_threshold=settings.memory_compact_turn_threshold,
                overlap_turns=settings.memory_overlap_turns,
            ),
            checkpointer=checkpointer_handle.checkpointer,
        )
    except Exception as exc:
        logger.warning("chat_memory_configuration_failed reason=%s", exc)
        checkpointer_handle = None
        memory_workflow = ChatMemoryWorkflow()
    return AgentService(
        llm_client=OpenAILLMClient(settings),
        memory_workflow=memory_workflow,
        checkpointer_handle=checkpointer_handle,
    )


_agent_service_instance: AgentService | None = None
_agent_service_lock = asyncio.Lock()


async def create_agent_service_async() -> AgentService:
    global _agent_service_instance
    if _agent_service_instance is not None:
        return _agent_service_instance

    async with _agent_service_lock:
        if _agent_service_instance is not None:
            return _agent_service_instance

        settings = get_settings()
        try:
            checkpointer_handle = await create_async_checkpointer(settings)
            memory_workflow = ChatMemoryWorkflow(
                policy=SlidingWindowPolicy(
                    compact_turn_threshold=settings.memory_compact_turn_threshold,
                    overlap_turns=settings.memory_overlap_turns,
                ),
                checkpointer=checkpointer_handle.checkpointer,
            )
        except Exception as exc:
            logger.warning("chat_memory_configuration_failed reason=%s", exc)
            checkpointer_handle = None
            memory_workflow = ChatMemoryWorkflow()

        _agent_service_instance = AgentService(
            llm_client=OpenAILLMClient(settings),
            memory_workflow=memory_workflow,
            checkpointer_handle=checkpointer_handle,
        )
        return _agent_service_instance
