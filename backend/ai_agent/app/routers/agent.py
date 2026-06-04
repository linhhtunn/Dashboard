from fastapi import APIRouter, Depends

from app.schemas import AgentResponse, ChatRequest, ExplainAlertRequest, SummaryRequest
from app.services.agent_service import AgentService, create_agent_service_async

router = APIRouter(prefix="/api/agent", tags=["agent"])


async def get_agent_service() -> AgentService:
    return await create_agent_service_async()


@router.post("/summary", response_model=AgentResponse)
async def summarize_patient(
    request: SummaryRequest,
    service: AgentService = Depends(get_agent_service),
) -> AgentResponse:
    return await service.summarize_patient(request)


@router.post("/explain-alert", response_model=AgentResponse)
async def explain_alert(
    request: ExplainAlertRequest,
    service: AgentService = Depends(get_agent_service),
) -> AgentResponse:
    return await service.explain_alert(request)


@router.post("/chat", response_model=AgentResponse)
async def chat(
    request: ChatRequest,
    service: AgentService = Depends(get_agent_service),
) -> AgentResponse:
    return await service.chat(request)
