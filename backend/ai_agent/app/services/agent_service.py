from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from functools import lru_cache

from app.agents.clinical import ClinicalAgent
from app.api.schemas.agent_requests import ChatRequest, ExplainAlertRequest, SummaryRequest
from app.core.config import get_settings
from app.core.container import build_agent_service, build_agent_service_async
from app.contracts.agent_response import AgentResponse
from app.memory.checkpointer import CheckpointerHandle
from app.memory.store import StoreHandle
from app.memory.thread_registry import ThreadRegistry
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
    store_handle: StoreHandle | None = None
    thread_registry: ThreadRegistry = field(default_factory=ThreadRegistry)

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
        response = await ChatWorkflow(
            patient_repository=self.patient_repository,
            clinical_agent=self.clinical_agent,
            generation_service=self.generation_service,
            memory_workflow=self.memory_workflow,
            log_fallback=self._log_and_return_fallback,
        ).run(request)
        self.thread_registry.upsert(
            conversation_id=response.source_id,
            doctor_id=request.doctor_id,
            patient_id=response.patient_id,
            title=_build_thread_title(request.message),
            last_issue=_infer_thread_issue(response),
            last_intent=getattr(response, "intent", None),
            messages=[
                {"role": "user", "content": request.message},
                {"role": "assistant", "content": response.narrative_summary},
            ],
        )
        return response

    def list_patients(self, *, query: str | None = None, status: str | None = None) -> list[dict[str, object]]:
        patients = self.patient_repository.list(query=query, status=status)
        items: list[dict[str, object]] = []
        for patient in patients:
            latest_vitals = self.patient_repository.get_vitals(patient["id"], time_range="15m")
            latest_vital = latest_vitals[-1] if latest_vitals else None
            open_alert_count = len(self.alert_repository.list_by_patient(patient["id"]))
            items.append(
                {
                    "patient": patient,
                    "latest_vital": latest_vital,
                    "open_alert_count": open_alert_count,
                }
            )
        return items

    def get_patient_record(self, patient_id: str) -> dict[str, object]:
        return self._resolve_patient_record(patient_id)

    def get_patient_vitals(self, patient_id: str, *, time_range: str = "15m") -> dict[str, object]:
        return {
            "patient_id": patient_id,
            "range": time_range,
            "samples": self.patient_repository.get_vitals(patient_id, time_range=time_range),
            "metric_summaries": self.patient_repository.get_metric_summaries(patient_id),
        }

    def get_patient_alerts(self, patient_id: str) -> list[dict[str, object]]:
        return self.alert_repository.list_by_patient(patient_id)

    def list_alerts(self) -> list[dict[str, object]]:
        return self.alert_repository.list_open()

    def list_threads(self, *, doctor_id: str | None = None, patient_id: str | None = None) -> list[dict[str, object]]:
        return [
            {
                "conversation_id": item.conversation_id,
                "doctor_id": item.doctor_id,
                "patient_id": item.patient_id,
                "title": item.title,
                "last_message_at": item.last_message_at,
                "last_issue": item.last_issue,
                "last_intent": item.last_intent,
            }
            for item in self.thread_registry.list(doctor_id=doctor_id, patient_id=patient_id)
        ]

    def get_thread(self, conversation_id: str) -> dict[str, object] | None:
        record = self.thread_registry.get(conversation_id)
        if record is None:
            return None
        return {
            "meta": {
                "conversation_id": record.conversation_id,
                "doctor_id": record.doctor_id,
                "patient_id": record.patient_id,
                "title": record.title,
                "last_message_at": record.last_message_at,
                "last_issue": record.last_issue,
                "last_intent": record.last_intent,
            },
            "messages": record.messages,
        }

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

    def _resolve_patient_record(self, patient_id: str) -> dict[str, object]:
        matches = self.patient_repository.list(query=patient_id)
        for patient in matches:
            if patient["id"] == patient_id:
                return patient
        raise KeyError(patient_id)


def _build_thread_title(message: str) -> str:
    trimmed = message.strip()
    if not trimmed:
        return "New chat"
    return trimmed if len(trimmed) <= 48 else f"{trimmed[:48]}…"


def _infer_thread_issue(response: AgentResponse) -> str | None:
    if getattr(response, "recommended_issue_id", None):
        return response.recommended_issue_id
    if getattr(response, "focus_metrics", None):
        focus_metrics = getattr(response, "focus_metrics", [])
        return focus_metrics[0] if focus_metrics else None
    return None


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
