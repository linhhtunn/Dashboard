from fastapi import FastAPI

from app.api.routers.agent import router as agent_router
from app.api.routers.data import router as data_router
from app.core.config import get_settings
from app.core.logging import configure_logging

settings = get_settings()
configure_logging(settings.log_level)

app = FastAPI(
    title="AI Agent Clinical Assistant",
    version="0.1.0",
    description="FastAPI foundation for the Team 5 AI Agent service.",
)
app.include_router(agent_router)
app.include_router(data_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": "ai-agent",
        "status": "ok",
        "health": "/health",
        "docs": "/docs",
    }


@app.get("/health")
async def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "ai-agent",
        "model": settings.openai_model,
    }
