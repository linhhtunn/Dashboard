import logging
from typing import TypeVar

from app.config import Settings
from app.infrastructure.llm.providers import OpenAIProvider
from app.memory.checkpointer import create_async_checkpointer, create_checkpointer
from app.memory.policy import SlidingWindowPolicy
from app.memory.workflow import ChatMemoryWorkflow
from app.repositories.fixtures import FixtureAlertRepository, FixturePatientRepository
from app.repositories.ports import PatientRepository
from app.services.generation import GenerationService
from app.tools import ToolRegistry
from app.tools.clinical import PatientContextTool

logger = logging.getLogger(__name__)

AgentServiceT = TypeVar("AgentServiceT")


def build_agent_service(
    *,
    settings: Settings,
    service_cls: type[AgentServiceT],
) -> AgentServiceT:
    patient_repository = FixturePatientRepository()
    alert_repository = FixtureAlertRepository()
    generation_service = GenerationService(OpenAIProvider(settings))
    tool_registry = _build_tool_registry(patient_repository=patient_repository)
    checkpointer_handle = None

    try:
        checkpointer_handle = create_checkpointer(settings)
        memory_workflow = _build_memory_workflow(
            settings=settings,
            checkpointer=checkpointer_handle.checkpointer,
        )
    except Exception as exc:
        logger.warning("chat_memory_configuration_failed reason=%s", exc)
        memory_workflow = ChatMemoryWorkflow()

    return service_cls(
        generation_service=generation_service,
        patient_repository=patient_repository,
        alert_repository=alert_repository,
        memory_workflow=memory_workflow,
        tool_registry=tool_registry,
        checkpointer_handle=checkpointer_handle,
    )


async def build_agent_service_async(
    *,
    settings: Settings,
    service_cls: type[AgentServiceT],
) -> AgentServiceT:
    patient_repository = FixturePatientRepository()
    alert_repository = FixtureAlertRepository()
    generation_service = GenerationService(OpenAIProvider(settings))
    tool_registry = _build_tool_registry(patient_repository=patient_repository)
    checkpointer_handle = None

    try:
        checkpointer_handle = await create_async_checkpointer(settings)
        memory_workflow = _build_memory_workflow(
            settings=settings,
            checkpointer=checkpointer_handle.checkpointer,
        )
    except Exception as exc:
        logger.warning("chat_memory_configuration_failed reason=%s", exc)
        memory_workflow = ChatMemoryWorkflow()

    return service_cls(
        generation_service=generation_service,
        patient_repository=patient_repository,
        alert_repository=alert_repository,
        memory_workflow=memory_workflow,
        tool_registry=tool_registry,
        checkpointer_handle=checkpointer_handle,
    )


def _build_memory_workflow(
    *,
    settings: Settings,
    checkpointer,
) -> ChatMemoryWorkflow:
    return ChatMemoryWorkflow(
        policy=SlidingWindowPolicy(
            compact_turn_threshold=settings.memory_compact_turn_threshold,
            overlap_turns=settings.memory_overlap_turns,
        ),
        checkpointer=checkpointer,
    )


def _build_tool_registry(
    *,
    patient_repository: PatientRepository,
) -> ToolRegistry:
    registry = ToolRegistry()
    registry.register(PatientContextTool(patient_repository=patient_repository))
    return registry
