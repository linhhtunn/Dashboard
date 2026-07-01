from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rabbit_mq.rabbitmq import DEFAULT_ENV_PATH, load_env_file
from simulator.realtime.runtime import (
    ABNORMAL_EVENT_TYPES,
    ACTIVITY_STATES,
    SPEEDS,
    RealtimeRunConfig,
    SimulationManager,
)


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class CreateRunRequest(BaseModel):
    name: str = "Realtime Demo Patient"
    patient_id: str | None = None
    patient_source: str = "sandbox"
    age: int = Field(default=68, ge=18, le=100)
    gender: str = "male"
    lifestyle: str = "low_activity"
    health_status: str = "WARNING"
    risk_factors: list[str] = Field(default_factory=lambda: ["hypertension_risk", "fall_risk"])
    pregnancy_status: str = "none"
    activity: str = "resting"
    speed: int = 1
    duration_seconds: int | None = Field(default=None, ge=1)
    publish_rabbitmq: bool | None = None
    stop_existing_runs: bool = True
    seed: int = 42


class ActivityRequest(BaseModel):
    activity: str


class SpeedRequest(BaseModel):
    speed: int


class PublishRequest(BaseModel):
    publish_rabbitmq: bool


class AbnormalRequest(BaseModel):
    episode_type: str
    duration_seconds: int | None = Field(default=None, ge=1)


ENV_PATH = Path(os.getenv("SIMULATOR_RABBITMQ_ENV", str(DEFAULT_ENV_PATH)))
load_env_file(ENV_PATH)
DEFAULT_PUBLISH = _env_bool("SIMULATOR_PUBLISH_RABBITMQ", False)
manager = SimulationManager(env_path=ENV_PATH if ENV_PATH.exists() else None)

app = FastAPI(title="Realtime Wearable Simulator", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("SIMULATOR_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "activity_states": ACTIVITY_STATES,
        "abnormal_event_types": ABNORMAL_EVENT_TYPES,
        "speeds": SPEEDS,
        "default_publish_rabbitmq": DEFAULT_PUBLISH,
    }


@app.post("/simulator/runs")
def create_run(request: CreateRunRequest) -> dict[str, Any]:
    try:
        patient_source = request.patient_source.strip().lower()
        requested_publish = DEFAULT_PUBLISH if request.publish_rabbitmq is None else request.publish_rabbitmq
        publish_rabbitmq = bool(requested_publish and patient_source == "existing")
        return manager.create_run(
            RealtimeRunConfig(
                name=request.name,
                patient_id=request.patient_id,
                patient_source=patient_source,
                age=request.age,
                gender=request.gender,
                lifestyle=request.lifestyle,
                health_status=request.health_status,
                risk_factors=request.risk_factors,
                pregnancy_status=request.pregnancy_status,
                activity=request.activity,
                speed=request.speed,
                duration_seconds=request.duration_seconds,
                publish_rabbitmq=publish_rabbitmq,
                validate_existing_patient=patient_source == "existing",
                seed=request.seed,
            ),
            stop_existing_runs=request.stop_existing_runs,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/simulator/runs/{run_id}/start")
def start_run(run_id: str) -> dict[str, Any]:
    return _run(run_id).start()


@app.get("/simulator/runs")
def list_runs() -> dict[str, Any]:
    return {"runs": manager.list_runs()}


@app.post("/simulator/runs/stop-all")
def stop_all_runs() -> dict[str, Any]:
    return manager.stop_all()


@app.post("/simulator/runs/{run_id}/pause")
def pause_run(run_id: str) -> dict[str, Any]:
    return _run(run_id).pause()


@app.post("/simulator/runs/{run_id}/resume")
def resume_run(run_id: str) -> dict[str, Any]:
    return _run(run_id).resume()


@app.post("/simulator/runs/{run_id}/stop")
def stop_run(run_id: str) -> dict[str, Any]:
    return _run(run_id).stop()


@app.post("/simulator/runs/{run_id}/reset")
def reset_run(run_id: str) -> dict[str, Any]:
    return _run(run_id).reset()


@app.patch("/simulator/runs/{run_id}/activity")
def set_activity(run_id: str, request: ActivityRequest) -> dict[str, Any]:
    try:
        return _run(run_id).set_activity(request.activity)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.patch("/simulator/runs/{run_id}/speed")
def set_speed(run_id: str, request: SpeedRequest) -> dict[str, Any]:
    try:
        return _run(run_id).set_speed(request.speed)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.patch("/simulator/runs/{run_id}/publish")
def set_publish(run_id: str, request: PublishRequest) -> dict[str, Any]:
    try:
        return _run(run_id).set_publish_rabbitmq(request.publish_rabbitmq)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/simulator/runs/{run_id}/abnormal")
def inject_abnormal(run_id: str, request: AbnormalRequest) -> dict[str, Any]:
    try:
        return _run(run_id).inject_abnormal(request.episode_type, request.duration_seconds)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.delete("/simulator/runs/{run_id}/abnormal")
def clear_abnormal(run_id: str) -> dict[str, Any]:
    return _run(run_id).clear_abnormal()


@app.get("/simulator/runs/{run_id}/snapshot")
def snapshot(run_id: str) -> dict[str, Any]:
    return _run(run_id).snapshot()


@app.on_event("shutdown")
def shutdown() -> None:
    manager.close()


def _run(run_id: str):
    try:
        return manager.get(run_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Run not found: {run_id}") from exc
