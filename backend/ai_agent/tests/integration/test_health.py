import httpx
import pytest

from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint_reports_service_status() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "ai-agent",
        "model": "gpt-5.4-mini",
    }
