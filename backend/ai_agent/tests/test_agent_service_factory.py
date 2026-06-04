from app.services.agent_service import create_agent_service


def test_create_agent_service_reuses_process_singleton() -> None:
    create_agent_service.cache_clear()

    first = create_agent_service()
    second = create_agent_service()

    assert first is second
