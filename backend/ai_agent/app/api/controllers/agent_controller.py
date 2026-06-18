from app.api.schemas.agent_requests import ChatRequest
from app.contracts.agent_response import AgentResponse
from app.services.agent_service import AgentService


async def chat(
    request: ChatRequest,
    service: AgentService,
) -> AgentResponse:
    return await service.chat(request)
