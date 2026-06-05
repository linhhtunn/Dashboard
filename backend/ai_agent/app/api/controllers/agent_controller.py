from app.api.schemas.agent_requests import ChatRequest, ExplainAlertRequest, SummaryRequest
from app.contracts.agent_response import AgentResponse
from app.services.agent_service import AgentService


async def summarize_patient(
    request: SummaryRequest,
    service: AgentService,
) -> AgentResponse:
    return await service.summarize_patient(request)


async def explain_alert(
    request: ExplainAlertRequest,
    service: AgentService,
) -> AgentResponse:
    return await service.explain_alert(request)


async def chat(
    request: ChatRequest,
    service: AgentService,
) -> AgentResponse:
    return await service.chat(request)
