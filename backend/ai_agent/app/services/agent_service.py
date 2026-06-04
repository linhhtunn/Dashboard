from __future__ import annotations

import logging
import asyncio
from dataclasses import dataclass, field
from functools import lru_cache

from app.config import get_settings
from app.services.fallback import (
    build_chat_fallback,
    build_explain_alert_fallback,
    build_summary_fallback,
)
from app.infrastructure.llm.providers import OpenAIProvider
from app.memory.checkpointer import (
    CheckpointerHandle,
    create_async_checkpointer,
    create_checkpointer,
)
from app.memory.policy import SlidingWindowPolicy
from app.memory.workflow import ChatGenerationResult, ChatMemoryWorkflow
from app.api.schemas.agent_requests import ChatRequest, ExplainAlertRequest, SummaryRequest
from app.contracts.agent_response import AgentResponse, ResponseType
from app.repositories.ports import AlertRepository, PatientRepository, RepositoryItemNotFoundError
from app.services.safety import PromptSafetyDecision, classify_prompt_injection
from app.services.generation import GenerationResult, GenerationService
from app.services.prompt_builder import (
    build_chat_prompt,
    build_explain_alert_prompt,
    build_summary_prompt,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AgentService:
    generation_service: GenerationService
    patient_repository: PatientRepository
    alert_repository: AlertRepository
    memory_workflow: ChatMemoryWorkflow = field(default_factory=ChatMemoryWorkflow)
    checkpointer_handle: CheckpointerHandle | None = None

    async def summarize_patient(self, request: SummaryRequest) -> AgentResponse:
        try:
            patient = self.patient_repository.get_by_id(request.patient_id)
        except RepositoryItemNotFoundError:
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
            alert = self.alert_repository.get_by_id(request.alert_id)
            patient = self.patient_repository.get_by_id(alert["patient_id"])
        except RepositoryItemNotFoundError:
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
            patient = self.patient_repository.get_by_id(request.patient_id)
        except RepositoryItemNotFoundError:
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
            result = await self._generate_with_contract_result(
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
            return ChatGenerationResult(
                response=result.response,
                safe_for_memory=result.safe_for_memory,
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
        fallback,
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
        fallback,
    ) -> GenerationResult:
        return await self.generation_service.generate_with_contract(
            user_prompt=user_prompt,
            expected_response_type=expected_response_type,
            expected_patient_id=expected_patient_id,
            expected_source_id=expected_source_id,
            fallback=fallback,
            log_fallback=self._log_and_return_fallback,
        )

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


@lru_cache
def create_agent_service() -> AgentService:
    settings = get_settings()
    patient_repository, alert_repository = _create_fixture_repositories()
    generation_service = GenerationService(OpenAIProvider(settings))
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
        generation_service=generation_service,
        patient_repository=patient_repository,
        alert_repository=alert_repository,
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
        patient_repository, alert_repository = _create_fixture_repositories()
        generation_service = GenerationService(OpenAIProvider(settings))
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
            generation_service=generation_service,
            patient_repository=patient_repository,
            alert_repository=alert_repository,
            memory_workflow=memory_workflow,
            checkpointer_handle=checkpointer_handle,
        )
        return _agent_service_instance


def _create_fixture_repositories() -> tuple[PatientRepository, AlertRepository]:
    from app.repositories.fixtures import FixtureAlertRepository, FixturePatientRepository

    return FixturePatientRepository(), FixtureAlertRepository()
