from app.config import Settings
from app.core.container import build_agent_service
from app.memory.workflow import ChatMemoryWorkflow
from app.repositories.fixtures import FixtureAlertRepository, FixturePatientRepository
from app.services.agent_service import AgentService
from app.services.generation import GenerationService


def test_container_builds_agent_service_with_runtime_dependencies() -> None:
    service = build_agent_service(
        settings=Settings(MEMORY_CHECKPOINTER="memory", OPENAI_API_KEY=None),
        service_cls=AgentService,
    )

    assert isinstance(service, AgentService)
    assert isinstance(service.generation_service, GenerationService)
    assert isinstance(service.patient_repository, FixturePatientRepository)
    assert isinstance(service.alert_repository, FixtureAlertRepository)
    assert isinstance(service.memory_workflow, ChatMemoryWorkflow)
    assert service.tool_registry.names() == ["clinical.patient_context"]


def test_container_falls_back_to_manual_memory_when_memory_config_fails() -> None:
    service = build_agent_service(
        settings=Settings(MEMORY_CHECKPOINTER="unsupported", OPENAI_API_KEY=None),
        service_cls=AgentService,
    )

    assert service.checkpointer_handle is None
    assert service.memory_workflow._graph is None
