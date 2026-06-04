import json

import httpx
import pytest

from app.main import app
from app.routers.agent import get_agent_service
from app.contracts.agent_response import ResponseType, validate_agent_response
from app.services.agent_service import AgentService
from tests.test_agent_service import FakeLLM, contract_payload, make_agent_service


@pytest.fixture
def fake_service() -> AgentService:
    return make_agent_service(
        FakeLLM(
            [
                json.dumps(contract_payload(response_type="summary", source_id="P001")),
                json.dumps(
                    contract_payload(
                        response_type="explain-alert",
                        patient_id="P001",
                        source_id="ALT_FALL_0092",
                    )
                ),
                json.dumps(
                    contract_payload(
                        response_type="chat",
                        patient_id="P001",
                        source_id="CONV_P001_001",
                    )
                ),
            ]
        )
    )


@pytest.fixture
async def client(fake_service: AgentService):
    async def override_agent_service() -> AgentService:
        return fake_service

    app.dependency_overrides[get_agent_service] = override_agent_service
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_summary_endpoint_returns_contract_response(client: httpx.AsyncClient) -> None:
    response = await client.post("/api/agent/summary", json={"patient_id": "P001"})

    assert response.status_code == 200
    payload = validate_agent_response(response.json())
    assert payload.response_type == ResponseType.SUMMARY
    assert payload.source_id == "P001"


@pytest.mark.asyncio
async def test_explain_alert_endpoint_returns_contract_response(client: httpx.AsyncClient) -> None:
    response = await client.post("/api/agent/explain-alert", json={"alert_id": "ALT_FALL_0092"})

    assert response.status_code == 200
    payload = validate_agent_response(response.json())
    assert payload.response_type == ResponseType.EXPLAIN_ALERT
    assert payload.source_id == "ALT_FALL_0092"


@pytest.mark.asyncio
async def test_chat_endpoint_returns_contract_response(client: httpx.AsyncClient) -> None:
    response = await client.post(
        "/api/agent/chat",
        json={
            "patient_id": "P001",
            "conversation_id": "CONV_P001_001",
            "message": "Nhip tim gan day ra sao?",
        },
    )

    assert response.status_code == 200
    payload = validate_agent_response(response.json())
    assert payload.response_type == ResponseType.CHAT
    assert payload.source_id == "CONV_P001_001"


@pytest.mark.asyncio
async def test_agent_endpoints_return_validation_errors(client: httpx.AsyncClient) -> None:
    summary = await client.post("/api/agent/summary", json={})
    explain = await client.post("/api/agent/explain-alert", json={})
    chat = await client.post(
        "/api/agent/chat",
        json={
            "patient_id": "P001",
            "message": "Hello",
            "history": [{"role": "doctor", "content": "bad role"}],
        },
    )

    assert summary.status_code == 422
    assert explain.status_code == 422
    assert chat.status_code == 422


@pytest.mark.asyncio
async def test_openapi_docs_expose_agent_routes(client: httpx.AsyncClient) -> None:
    response = await client.get("/openapi.json")

    paths = response.json()["paths"]
    assert "/api/agent/summary" in paths
    assert "/api/agent/explain-alert" in paths
    assert "/api/agent/chat" in paths
