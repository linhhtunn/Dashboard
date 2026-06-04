from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from functools import lru_cache

from app.agents.clinical import ClinicalAgent
from app.api.schemas.agent_requests import ChatRequest, ExplainAlertRequest, SummaryRequest
from app.config import get_settings
from app.core.container import build_agent_service, build_agent_service_async
from app.contracts.agent_response import AgentResponse
from app.memory.checkpointer import CheckpointerHandle
from app.memory.workflow import ChatMemoryWorkflow
from app.repositories.ports import AlertRepository, PatientRepository
from app.services.generation import GenerationService
from app.tools import ToolRegistry
from app.workflows import ChatWorkflow, ExplainAlertWorkflow, SummaryWorkflow

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AgentService:
    generation_service: GenerationService
    patient_repository: PatientRepository
    alert_repository: AlertRepository
    memory_workflow: ChatMemoryWorkflow = field(default_factory=ChatMemoryWorkflow)
    clinical_agent: ClinicalAgent = field(default_factory=ClinicalAgent)
    tool_registry: ToolRegistry = field(default_factory=ToolRegistry)
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
    return build_agent_service(
        settings=get_settings(),
        service_cls=AgentService,
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

        _agent_service_instance = await build_agent_service_async(
            settings=get_settings(),
            service_cls=AgentService,
        )
        return _agent_service_instance
