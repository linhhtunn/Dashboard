from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.controllers import data_controller
from app.api.routers.agent import get_agent_service
from app.api.schemas.data_contracts import (
    AlertDTO,
    PatientDTO,
    PatientListItemDTO,
    PatientVitalsResponseDTO,
    ThreadDetailDTO,
    ThreadMetaDTO,
)
from app.services.agent_service import AgentService

router = APIRouter(tags=["data"])


@router.get("/api/patients", response_model=list[PatientListItemDTO])
async def list_patients(
    query: str | None = Query(default=None),
    status: str | None = Query(default=None),
    service: AgentService = Depends(get_agent_service),
) -> list[dict[str, object]]:
    return await data_controller.list_patients(service=service, query=query, status=status)


@router.get("/api/patients/{patient_id}", response_model=PatientDTO)
async def get_patient(
    patient_id: str,
    service: AgentService = Depends(get_agent_service),
) -> dict[str, object]:
    return await data_controller.get_patient(patient_id=patient_id, service=service)


@router.get("/api/patients/{patient_id}/vitals", response_model=PatientVitalsResponseDTO)
async def get_patient_vitals(
    patient_id: str,
    range: str = Query(default="15m"),
    service: AgentService = Depends(get_agent_service),
) -> dict[str, object]:
    return await data_controller.get_patient_vitals(
        patient_id=patient_id,
        time_range=range,
        service=service,
    )


@router.get("/api/patients/{patient_id}/alerts", response_model=list[AlertDTO])
async def get_patient_alerts(
    patient_id: str,
    service: AgentService = Depends(get_agent_service),
) -> list[dict[str, object]]:
    return await data_controller.get_patient_alerts(patient_id=patient_id, service=service)


@router.get("/api/alerts", response_model=list[AlertDTO])
async def list_alerts(
    service: AgentService = Depends(get_agent_service),
) -> list[dict[str, object]]:
    return await data_controller.list_alerts(service=service)


@router.get("/api/threads", response_model=list[ThreadMetaDTO])
async def list_threads(
    doctor_id: str | None = Query(default=None),
    patient_id: str | None = Query(default=None),
    service: AgentService = Depends(get_agent_service),
) -> list[dict[str, object]]:
    return await data_controller.list_threads(
        service=service,
        doctor_id=doctor_id,
        patient_id=patient_id,
    )


@router.get("/api/threads/{conversation_id}", response_model=ThreadDetailDTO)
async def get_thread(
    conversation_id: str,
    service: AgentService = Depends(get_agent_service),
) -> dict[str, object]:
    return await data_controller.get_thread(conversation_id=conversation_id, service=service)
