from fastapi import FastAPI

from app.config import get_settings
from app.logging_config import configure_logging

settings = get_settings()
configure_logging(settings.log_level)

app = FastAPI(
    title="AI Agent Clinical Assistant",
    version="0.1.0",
    description="FastAPI foundation for the Team 5 AI Agent service.",
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "ai-agent",
        "model": settings.openai_model,
    }
