from fastapi import FastAPI

from app.config import get_settings
from app.infrastructure.observability import configure_logging
from app.routers.agent import router as agent_router

settings = get_settings()
configure_logging(settings.log_level)

app = FastAPI(
    title="AI Agent Clinical Assistant",
    version="0.1.0",
    description="FastAPI foundation for the Team 5 AI Agent service.",
)
app.include_router(agent_router)


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
