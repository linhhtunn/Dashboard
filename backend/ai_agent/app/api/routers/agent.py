from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import json
import uuid

from app.api.controllers import agent_controller
from app.api.schemas.agent_requests import ChatRequest
from app.core.config import get_settings
from app.contracts.agent_response import AgentResponse
from app.services.agent_service import AgentService, create_agent_service_async
from app.observability.ai_audit import record_ai_interaction
from app.security_rate_limit import ai_rate_limiter
from app.security import (
    InputSanitizer,
    SupabaseUser,
    assert_patient_access,
    authorize_chat_request,
    enforce_ai_mode,
    sanitize_request_or_400,
    verify_supabase_jwt,
)

router = APIRouter(prefix="/api/agent", tags=["agent"])


def ensure_ai_enabled() -> None:
    if get_settings().ai_mode == "off":
        raise HTTPException(status_code=503, detail="Clinical AI is disabled")


async def get_agent_service() -> AgentService:
    return await create_agent_service_async()


@router.post("/chat", response_model=AgentResponse)
async def chat(
    request: ChatRequest,
    _: None = Depends(ensure_ai_enabled),
    user: SupabaseUser = Depends(verify_supabase_jwt),
    service: AgentService = Depends(get_agent_service),
) -> AgentResponse:
    request = sanitize_request_or_400(request)
    await ai_rate_limiter.check(user.user_id)
    enforce_ai_mode(request)
    await authorize_chat_request(
        request=request,
        user=user,
        patient_repository=service.patient_repository,
    )
    response = await agent_controller.chat(request, service)
    await record_ai_interaction(
        actor_user_id=user.user_id,
        patient_id=request.patient_id,
        response=response,
        correlation_id=str(uuid.uuid4()),
    )
    return response


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    _: None = Depends(ensure_ai_enabled),
    user: SupabaseUser = Depends(verify_supabase_jwt),
    service: AgentService = Depends(get_agent_service),
) -> StreamingResponse:
    request = sanitize_request_or_400(request)
    await ai_rate_limiter.check(user.user_id)
    enforce_ai_mode(request)
    await authorize_chat_request(
        request=request,
        user=user,
        patient_repository=service.patient_repository,
    )

    async def event_generator():
        try:
            async for event_type, val in service.chat_stream(request):
                if event_type == "token":
                    # Stream raw narrative summary tokens
                    yield f"event: token\ndata: {val}\n\n"
                elif event_type == "status":
                    # Stream agent status updates
                    yield f"event: status\ndata: {val}\n\n"
                elif event_type == "result":
                    # Stream the final validated AgentResponse JSON
                    await record_ai_interaction(
                        actor_user_id=user.user_id,
                        patient_id=request.patient_id,
                        response=val,
                        correlation_id=str(uuid.uuid4()),
                    )
                    data_str = json.dumps(val.model_dump(mode="json"))
                    yield f"event: result\ndata: {data_str}\n\n"
        except Exception as exc:
            yield f"event: error\ndata: {str(exc)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/patients/{patient_id}/vitals-summary")
async def get_patient_vitals_summary(
    patient_id: str,
    time_window_minutes: int = 60,
    interval_seconds: int | None = None,
    user: SupabaseUser = Depends(verify_supabase_jwt),
    service: AgentService = Depends(get_agent_service),
):
    try:
        patient_id = InputSanitizer().sanitize_patient_id(patient_id) or patient_id
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    await assert_patient_access(patient_id, user, service.patient_repository)
    from app.tools.base import ToolRequest
    tool = service.tool_registry.get("clinical.get_patient_vitals_summary")
    if not tool:
        return {"summary": []}
    
    arguments = {
        "patient_id": patient_id,
        "time_window_minutes": time_window_minutes
    }
    if interval_seconds is not None:
        arguments["interval_seconds"] = interval_seconds

    req = ToolRequest(
        name="clinical.get_patient_vitals_summary",
        arguments=arguments
    )
    res = await tool.run(req)
    return res.data


@router.get("/patients/{patient_id}/alerts")
async def get_patient_alerts(
    patient_id: str,
    limit: int = 10,
    user: SupabaseUser = Depends(verify_supabase_jwt),
    service: AgentService = Depends(get_agent_service),
):
    try:
        patient_id = InputSanitizer().sanitize_patient_id(patient_id) or patient_id
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    await assert_patient_access(patient_id, user, service.patient_repository)
    if hasattr(service.alert_repository, "get_alerts_by_patient"):
        return service.alert_repository.get_alerts_by_patient(patient_id, limit)
    
    try:
        latest_id = service.alert_repository.get_latest_alert_id_by_patient(patient_id)
        if latest_id:
            alert = service.alert_repository.get_by_id(latest_id)
            return [alert]
    except Exception:
        pass
    return []
