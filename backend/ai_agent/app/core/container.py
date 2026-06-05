import logging
from typing import TypeVar

from app.core.config import Settings
from app.memory.checkpointer import create_async_checkpointer, create_checkpointer
from app.memory.store import create_async_store, create_store
from app.memory.policy import SlidingWindowPolicy
from app.memory.workflow import ChatMemoryWorkflow
from app.repositories.fixtures import FixtureAlertRepository, FixturePatientRepository
from app.repositories.ports import PatientRepository
from app.tools import ToolRegistry
from app.tools.clinical import PatientContextTool, VitalsSummaryTool
from app.infrastructure.database import PostgresConnector

logger = logging.getLogger(__name__)

AgentServiceT = TypeVar("AgentServiceT")


def build_agent_service(
    *,
    settings: Settings,
    service_cls: type[AgentServiceT],
) -> AgentServiceT:
    from app.infrastructure.llm.providers import OpenAIProvider
    from app.services.generation import GenerationService
    from app.repositories.postgres import PostgresPatientRepository, PostgresAlertRepository

    dsn = settings.resolved_memory_postgres_dsn
    if dsn:
        logger.info("postgres_dsn_detected instantiating_db_repositories")
        db_connector = PostgresConnector(dsn)
        patient_repository = PostgresPatientRepository(db_connector)
        alert_repository = PostgresAlertRepository(db_connector)
    else:
        logger.info("postgres_dsn_absent falling_back_to_fixture_repositories")
        db_connector = None
        patient_repository = FixturePatientRepository()
        alert_repository = FixtureAlertRepository()

    generation_service = GenerationService(OpenAIProvider(settings))
    tool_registry = _build_tool_registry(
        patient_repository=patient_repository,
        db_connector=db_connector
    )
    checkpointer_handle = None
    store_handle = None

    try:
        checkpointer_handle = create_checkpointer(settings)
        store_handle = create_store(settings)
        memory_workflow = _build_memory_workflow(
            settings=settings,
            checkpointer=checkpointer_handle.checkpointer,
            store=store_handle.store,
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
        store_handle=store_handle,
    )


async def build_agent_service_async(
    *,
    settings: Settings,
    service_cls: type[AgentServiceT],
) -> AgentServiceT:
    from app.infrastructure.llm.providers import OpenAIProvider
    from app.services.generation import GenerationService
    from app.repositories.postgres import PostgresPatientRepository, PostgresAlertRepository

    dsn = settings.resolved_memory_postgres_dsn
    if dsn:
        logger.info("postgres_dsn_detected instantiating_db_repositories")
        db_connector = PostgresConnector(dsn)
        patient_repository = PostgresPatientRepository(db_connector)
        alert_repository = PostgresAlertRepository(db_connector)
    else:
        logger.info("postgres_dsn_absent falling_back_to_fixture_repositories")
        db_connector = None
        patient_repository = FixturePatientRepository()
        alert_repository = FixtureAlertRepository()

    generation_service = GenerationService(OpenAIProvider(settings))
    tool_registry = _build_tool_registry(
        patient_repository=patient_repository,
        db_connector=db_connector
    )
    checkpointer_handle = None
    store_handle = None

    try:
        checkpointer_handle = await create_async_checkpointer(settings)
        store_handle = await create_async_store(settings)
        memory_workflow = _build_memory_workflow(
            settings=settings,
            checkpointer=checkpointer_handle.checkpointer,
            store=store_handle.store,
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
        store_handle=store_handle,
    )


def _build_memory_workflow(
    *,
    settings: Settings,
    checkpointer,
    store=None,
) -> ChatMemoryWorkflow:
    return ChatMemoryWorkflow(
        policy=SlidingWindowPolicy(
            compact_turn_threshold=settings.memory_compact_turn_threshold,
            overlap_turns=settings.memory_overlap_turns,
        ),
        checkpointer=checkpointer,
        store=store,
    )


def _build_tool_registry(
    *,
    patient_repository: PatientRepository,
    db_connector: PostgresConnector | None = None,
) -> ToolRegistry:
    registry = ToolRegistry()
    registry.register(PatientContextTool(patient_repository=patient_repository))
    registry.register(VitalsSummaryTool(db_connector=db_connector))
    return registry
