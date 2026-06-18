from app.core.config import Settings
from app.core.container import build_agent_service
from app.memory.workflow import ChatMemoryWorkflow
from app.repositories.fixtures import FixtureAlertRepository, FixturePatientRepository
from app.services.agent_service import AgentService
from app.services.generation import GenerationService


def test_container_builds_agent_service_with_runtime_dependencies() -> None:
    service = build_agent_service(
        settings=Settings(
            MEMORY_CHECKPOINTER="memory",
            OPENAI_API_KEY=None,
            MEMORY_POSTGRES_DSN="",
            SUPABASE_DB_URL="",
            sqlite_db_path="",
        ),
        service_cls=AgentService,
    )

    assert isinstance(service, AgentService)
    assert isinstance(service.generation_service, GenerationService)
    assert isinstance(service.patient_repository, FixturePatientRepository)
    assert isinstance(service.alert_repository, FixtureAlertRepository)
    assert isinstance(service.memory_workflow, ChatMemoryWorkflow)
    assert sorted(service.tool_registry.names()) == sorted([
        "clinical.alert_explanation_context",
        "clinical.doctor_patient_overview_context",
        "clinical.get_patient_vitals_summary",
        "clinical.medication_recommendation_context",
        "clinical.medical_search_tool",
        "clinical.patient_context",
        "clinical.patient_search_context",
        "clinical.patient_summary_context",
        "clinical.vitals_trend_context",
    ])


def test_settings_support_langfuse_observability_defaults_and_overrides() -> None:
    defaults = Settings(_env_file=None)
    assert defaults.langfuse_enabled is False
    assert defaults.langfuse_capture_content is False
    assert defaults.langfuse_patient_id_mode == "hash"

    overridden = Settings(
        _env_file=None,
        LANGFUSE_ENABLED=True,
        LANGFUSE_PUBLIC_KEY="pk",
        LANGFUSE_SECRET_KEY="sk",
        LANGFUSE_BASE_URL="https://langfuse.example",
        LANGFUSE_PATIENT_ID_MODE="masked",
    )
    assert overridden.langfuse_enabled is True
    assert overridden.resolved_langfuse_base_url == "https://langfuse.example"
    assert overridden.langfuse_patient_id_mode == "masked"


def test_container_falls_back_to_manual_memory_when_memory_config_fails() -> None:
    service = build_agent_service(
        settings=Settings(
            MEMORY_CHECKPOINTER="unsupported",
            OPENAI_API_KEY=None,
            MEMORY_POSTGRES_DSN="",
            SUPABASE_DB_URL="",
            sqlite_db_path="",
        ),
        service_cls=AgentService,
    )

    assert service.checkpointer_handle is None
    from app.workflows import ChatWorkflow
    chat_wf = ChatWorkflow(
        patient_repository=service.patient_repository,
        clinical_agent=service.clinical_agent,
        generation_service=service.generation_service,
        memory_workflow=service.memory_workflow,
        log_fallback=lambda **kwargs: None,
    )
    assert getattr(chat_wf, "_graph", None) is None
