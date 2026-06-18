import logging
from typing import Any, TypeVar

from app.core.config import Settings
from app.memory.checkpointer import create_async_checkpointer, create_checkpointer
from app.memory.store import create_async_store, create_store
from app.memory import SlidingWindowPolicy
from app.memory.workflow import ChatMemoryWorkflow

from app.repositories.fixtures import FixtureAlertRepository, FixturePatientRepository
from app.repositories.ports import PatientRepository
from app.tools import ToolRegistry
from app.tools.clinical import (
    AlertExplanationContextTool,
    DoctorPatientOverviewContextTool,
    PatientContextTool,
    PatientSearchContextTool,
    PatientSummaryContextTool,
    VitalsSummaryTool,
    VitalsTrendContextTool,
)
from app.infrastructure.database import PostgresConnector
from app.repositories.ports import AlertRepository
from app.services.clinical import MedicationDomainRegistry

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

    timescale_dsn = settings.resolved_timescale_dsn
    if timescale_dsn:
        logger.info("timescale_dsn_detected instantiating_timescale_connector")
        timescale_connector = PostgresConnector(timescale_dsn)
    else:
        timescale_connector = None

    dsn = settings.resolved_memory_postgres_dsn
    if dsn:
        logger.info("postgres_dsn_detected instantiating_db_repositories")
        db_connector = PostgresConnector(dsn)
        patient_repository = PostgresPatientRepository(db_connector)
        alert_repository = PostgresAlertRepository(
            db_connector,
            timescale_connector=timescale_connector,
        )
    else:
        db_connector = None
        if settings.supabase_url or settings.supabase_service_key:
            if not settings.supabase_url or not settings.supabase_service_key:
                raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY are required for Supabase repositories.")
            logger.info("supabase_rest_detected instantiating_supabase_repositories")
            from app.repositories.supabase import SupabaseAlertRepository, SupabasePatientRepository
            patient_repository = SupabasePatientRepository(settings.supabase_url, settings.supabase_service_key)
            alert_repository = SupabaseAlertRepository(settings.supabase_url, settings.supabase_service_key)
        elif settings.sqlite_db_path:
            logger.info("sqlite_db_path_detected instantiating_sqlite_patient_repository")
            from app.repositories.sqlite.patient_repository import SQLitePatientRepository
            patient_repository = SQLitePatientRepository(settings.sqlite_db_path)
            alert_repository = FixtureAlertRepository()
        else:
            logger.info("sqlite_db_path_absent falling_back_to_fixture_repositories")
            patient_repository = FixturePatientRepository()
            alert_repository = FixtureAlertRepository()

    generation_service = GenerationService(OpenAIProvider(settings))
    checkpointer_handle = None
    store_handle = None

    try:
        checkpointer_handle = create_checkpointer(settings)
        store_handle = create_store(settings)
        memory_workflow = _build_memory_workflow(
            settings=settings,
            checkpointer=checkpointer_handle.checkpointer,
            store=store_handle.store,
            llm_provider=generation_service.llm_provider,
        )
    except Exception as exc:
        logger.warning("chat_memory_configuration_failed reason=%s", exc)
        memory_workflow = ChatMemoryWorkflow(llm_provider=generation_service.llm_provider)

    import os
    import app as app_pkg
    app_dir = os.path.dirname(app_pkg.__file__)
    rules_dir = os.path.join(os.path.dirname(app_dir), "rules")

    from app.services.clinical import MedicationDomainRegistry
    domain_registry = MedicationDomainRegistry(rules_dir)
    domain_registry.discover_domains()

    tool_registry = _build_tool_registry(
        patient_repository=patient_repository,
        alert_repository=alert_repository,
        domain_registry=domain_registry,
        db_connector=db_connector,
        timescale_connector=timescale_connector,
        llm_provider=generation_service.llm_provider,
    )

    guideline_retriever = domain_registry.get_retriever("af_anticoagulation")

    return service_cls(
        generation_service=generation_service,
        patient_repository=patient_repository,
        alert_repository=alert_repository,
        memory_workflow=memory_workflow,
        tool_registry=tool_registry,
        checkpointer_handle=checkpointer_handle,
        store_handle=store_handle,
        guideline_retriever=guideline_retriever,
    )


async def build_agent_service_async(
    *,
    settings: Settings,
    service_cls: type[AgentServiceT],
) -> AgentServiceT:
    from app.infrastructure.llm.providers import OpenAIProvider
    from app.services.generation import GenerationService
    from app.repositories.postgres import PostgresPatientRepository, PostgresAlertRepository

    timescale_dsn = settings.resolved_timescale_dsn
    if timescale_dsn:
        logger.info("timescale_dsn_detected instantiating_timescale_connector")
        timescale_connector = PostgresConnector(timescale_dsn)
    else:
        timescale_connector = None

    dsn = settings.resolved_memory_postgres_dsn
    if dsn:
        logger.info("postgres_dsn_detected instantiating_db_repositories")
        db_connector = PostgresConnector(dsn)
        patient_repository = PostgresPatientRepository(db_connector)
        alert_repository = PostgresAlertRepository(
            db_connector,
            timescale_connector=timescale_connector,
        )
    else:
        db_connector = None
        if settings.supabase_url or settings.supabase_service_key:
            if not settings.supabase_url or not settings.supabase_service_key:
                raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY are required for Supabase repositories.")
            logger.info("supabase_rest_detected instantiating_supabase_repositories")
            from app.repositories.supabase import SupabaseAlertRepository, SupabasePatientRepository
            patient_repository = SupabasePatientRepository(settings.supabase_url, settings.supabase_service_key)
            alert_repository = SupabaseAlertRepository(settings.supabase_url, settings.supabase_service_key)
        elif settings.sqlite_db_path:
            logger.info("sqlite_db_path_detected instantiating_sqlite_patient_repository")
            from app.repositories.sqlite.patient_repository import SQLitePatientRepository
            patient_repository = SQLitePatientRepository(settings.sqlite_db_path)
            alert_repository = FixtureAlertRepository()
        else:
            logger.info("sqlite_db_path_absent falling_back_to_fixture_repositories")
            patient_repository = FixturePatientRepository()
            alert_repository = FixtureAlertRepository()

    generation_service = GenerationService(OpenAIProvider(settings))
    checkpointer_handle = None
    store_handle = None

    try:
        checkpointer_handle = await create_async_checkpointer(settings)
        store_handle = await create_async_store(settings)
        memory_workflow = _build_memory_workflow(
            settings=settings,
            checkpointer=checkpointer_handle.checkpointer,
            store=store_handle.store,
            llm_provider=generation_service.llm_provider,
        )
    except Exception as exc:
        logger.warning("chat_memory_configuration_failed reason=%s", exc)
        memory_workflow = ChatMemoryWorkflow(llm_provider=generation_service.llm_provider)

    import os
    import app as app_pkg
    app_dir = os.path.dirname(app_pkg.__file__)
    rules_dir = os.path.join(os.path.dirname(app_dir), "rules")

    from app.services.clinical import MedicationDomainRegistry
    domain_registry = MedicationDomainRegistry(rules_dir)
    domain_registry.discover_domains()

    tool_registry = _build_tool_registry(
        patient_repository=patient_repository,
        alert_repository=alert_repository,
        domain_registry=domain_registry,
        db_connector=db_connector,
        timescale_connector=timescale_connector,
        llm_provider=generation_service.llm_provider,
    )

    guideline_retriever = domain_registry.get_retriever("af_anticoagulation")

    return service_cls(
        generation_service=generation_service,
        patient_repository=patient_repository,
        alert_repository=alert_repository,
        memory_workflow=memory_workflow,
        tool_registry=tool_registry,
        checkpointer_handle=checkpointer_handle,
        store_handle=store_handle,
        guideline_retriever=guideline_retriever,
    )


def _build_memory_workflow(
    *,
    settings: Settings,
    checkpointer,
    store=None,
    llm_provider=None,
) -> ChatMemoryWorkflow:
    return ChatMemoryWorkflow(
        policy=SlidingWindowPolicy(
            compact_turn_threshold=settings.memory_compact_turn_threshold,
            overlap_turns=settings.memory_overlap_turns,
        ),
        checkpointer=checkpointer,
        store=store,
        llm_provider=llm_provider,
    )


def _build_tool_registry(
    *,
    patient_repository: PatientRepository,
    alert_repository: AlertRepository,
    domain_registry: MedicationDomainRegistry,
    db_connector: PostgresConnector | None = None,
    timescale_connector: PostgresConnector | None = None,
    llm_provider: Any = None,
) -> ToolRegistry:
    from app.tools.clinical import MedicationRecommendationContextTool, MedicalSearchTool
    from app.core.config import get_settings

    registry = ToolRegistry()
    registry.register(PatientContextTool(patient_repository=patient_repository))
    vitals_summary_tool = VitalsSummaryTool(
        db_connector=db_connector,
        timescale_connector=timescale_connector,
    )
    registry.register(vitals_summary_tool)
    registry.register(PatientSummaryContextTool(patient_repository=patient_repository))
    registry.register(PatientSearchContextTool(patient_repository=patient_repository))
    registry.register(
        DoctorPatientOverviewContextTool(
            patient_repository=patient_repository,
            db_connector=db_connector,
        )
    )
    registry.register(
        AlertExplanationContextTool(
            alert_repository=alert_repository,
            patient_repository=patient_repository,
        )
    )
    registry.register(
        MedicationRecommendationContextTool(
            patient_repository=patient_repository,
            domain_registry=domain_registry,
        )
    )
    registry.register(VitalsTrendContextTool(vitals_summary_tool=vitals_summary_tool))

    settings = get_settings()
    registry.register(
        MedicalSearchTool(
            api_key=settings.exa_api_key,
            llm_provider=llm_provider,
        )
    )
    return registry
