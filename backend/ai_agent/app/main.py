import logging

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os

from app.api.routers.agent import router as agent_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.contracts.agent_response import AgentResponse, Comparison, ResponseType, Visualization
from app.security import DataUnavailableError, PatientAccessDeniedError, SecurityViolationError

settings = get_settings()
configure_logging(settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Agent Clinical Assistant",
    version="1.0.0",
    description="FastAPI foundation for the Team 5 AI Agent service.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origin_list,
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(agent_router)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(SecurityViolationError)
async def security_handler(request: Request, exc: SecurityViolationError):
    client_host = request.client.host if request.client else "unknown"
    logger.warning("security_violation host=%s reason=%s", client_host, exc)
    return JSONResponse(status_code=400, content={"detail": "Invalid request"})


@app.exception_handler(PatientAccessDeniedError)
async def access_denied_handler(request: Request, exc: PatientAccessDeniedError):
    return JSONResponse(status_code=403, content={"detail": "Access denied"})


@app.exception_handler(DataUnavailableError)
async def data_unavailable_handler(request: Request, exc: DataUnavailableError):
    return JSONResponse(
        status_code=200,
        content=AgentResponse(
            response_type=ResponseType.CHAT,
            patient_id="",
            source_id="error",
            narrative_summary=(
                "Du lieu hien khong kha dung. "
                "Vui long thu lai sau hoac kiem tra ket noi he thong."
            ),
            visualizations=Visualization(has_chart=False),
            comparisons=Comparison(has_comparison=False),
        ).model_dump(mode="json"),
    )


@app.get("/chat-ui", response_class=HTMLResponse)
async def get_chat_ui():
    static_file = os.path.join(os.path.dirname(__file__), "static", "index.html")
    if os.path.exists(static_file):
        with open(static_file, "r", encoding="utf-8") as f:
            return f.read()
    return HTMLResponse("<h1>HTML file not found</h1>", status_code=404)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": "ai-agent",
        "status": "ok",
        "health": "/health",
        "docs": "/docs",
        "chat_ui": "/chat-ui",
    }


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "version": app.version,
        "ai_mode": settings.ai_mode,
        "alert_dispatch_mode": settings.alert_dispatch_mode,
        "checks": {
            "supabase": await check_supabase(),
            "timescale": await check_timescale(),
            "openai": "configured" if settings.openai_api_key else "missing",
        },
    }


async def check_supabase() -> str:
    return "configured" if settings.supabase_url and settings.supabase_service_key else "missing"


async def check_timescale() -> str:
    return "configured" if settings.resolved_timescale_dsn else "missing"
