from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from functools import lru_cache

from app.agents.clinical import ClinicalAgent
from app.api.schemas.agent_requests import ChatRequest, ExplainAlertRequest, SummaryRequest
from app.config import get_settings
from app.contracts.agent_response import AgentResponse
from app.infrastructure.llm.providers import OpenAIProvider
from app.memory.checkpointer import (
    CheckpointerHandle,
    create_async_checkpointer,
    create_checkpointer,
)
from app.memory.policy import SlidingWindowPolicy
from app.memory.workflow import ChatMemoryWorkflow
from app.repositories.ports import AlertRepository, PatientRepository
from app.services.generation import GenerationService
from app.workflows import ChatWorkflow, ExplainAlertWorkflow, SummaryWorkflow

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AgentService:
    generation_service: GenerationService
    patient_repository: PatientRepository
    alert_repository: AlertRepository
    memory_workflow: ChatMemoryWorkflow = field(default_factory=ChatMemoryWorkflow)
    clinical_agent: ClinicalAgent = field(default_factory=ClinicalAgent)
    checkpointer_handle: CheckpointerHandle | None = None

    async def summarize_patient(self, request: SummaryRequest) -> AgentResponse:
        return await SummaryWorkflow(
            patient_repository=self.patient_repository,
            clinical_agent=self.clinical_agent,
            generation_service=self.generation_service,
            log_fallback=self._log_and_return_fallback,
        ).run(request)

    async def explain_alert(self, request: ExplainAlertRequest) -> AgentResponse:
        return await ExplainAlertWorkflow(
            alert_repository=self.alert_repository,
            patient_repository=self.patient_repository,
            clinical_agent=self.clinical_agent,
            generation_service=self.generation_service,
            log_fallback=self._log_and_return_fallback,
        ).run(request)

    async def chat(self, request: ChatRequest) -> AgentResponse:
        return await ChatWorkflow(
            patient_repository=self.patient_repository,
            clinical_agent=self.clinical_agent,
            generation_service=self.generation_service,
            memory_workflow=self.memory_workflow,
            log_fallback=self._log_and_return_fallback,
        ).run(request)

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
