from __future__ import annotations

from fastapi import HTTPException

from app.services.agent_service import AgentService


async def list_patients(
    *,
    service: AgentService,
    query: str | None,
    status: str | None,
) -> list[dict[str, object]]:
    return service.list_patients(query=query, status=status)


async def get_patient(*, patient_id: str, service: AgentService) -> dict[str, object]:
    try:
        return service.get_patient_record(patient_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Patient not found") from exc


async def get_patient_vitals(
    *,
    patient_id: str,
    time_range: str,
    service: AgentService,
) -> dict[str, object]:
    try:
        return service.get_patient_vitals(patient_id, time_range=time_range)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Patient not found") from exc


async def get_patient_alerts(*, patient_id: str, service: AgentService) -> list[dict[str, object]]:
    return service.get_patient_alerts(patient_id)


async def list_alerts(*, service: AgentService) -> list[dict[str, object]]:
    return service.list_alerts()


async def list_threads(
    *,
    service: AgentService,
    doctor_id: str | None,
    patient_id: str | None,
) -> list[dict[str, object]]:
    return service.list_threads(doctor_id=doctor_id, patient_id=patient_id)


async def get_thread(*, conversation_id: str, service: AgentService) -> dict[str, object]:
    thread = service.get_thread(conversation_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread
