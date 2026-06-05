from fastapi import APIRouter, Depends

from app.api.controllers import agent_controller
from app.api.schemas.agent_requests import ChatRequest, ExplainAlertRequest, SummaryRequest
from app.contracts.agent_response import AgentResponse
from app.services.agent_service import AgentService, create_agent_service_async

router = APIRouter(prefix="/api/agent", tags=["agent"])


async def get_agent_service() -> AgentService:
    return await create_agent_service_async()


@router.post("/summary", response_model=AgentResponse)
async def summarize_patient(
    request: SummaryRequest,
    service: AgentService = Depends(get_agent_service),
) -> AgentResponse:
    return await agent_controller.summarize_patient(request, service)


@router.post("/explain-alert", response_model=AgentResponse)
async def explain_alert(
    request: ExplainAlertRequest,
    service: AgentService = Depends(get_agent_service),
) -> AgentResponse:
    return await agent_controller.explain_alert(request, service)


@router.post("/chat", response_model=AgentResponse)
async def chat(
    request: ChatRequest,
    service: AgentService = Depends(get_agent_service),
) -> AgentResponse:
    return await agent_controller.chat(request, service)
