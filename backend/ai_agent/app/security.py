from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.schemas.agent_requests import ChatRequest
from app.core.config import get_settings
from app.core.config import Settings
from app.repositories.ports import PatientRepository, RepositoryItemNotFoundError

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

ALLOWED_ROLES = {"doctor", "nurse"}
SUMMARY_ROLES = {"doctor"}
GENERAL_ROLES = {"doctor", "nurse", "admin"}
JWKS_ALGORITHMS = {"ES256", "RS256"}


class SecurityViolationError(Exception):
    """Prompt injection or unauthorized access attempt."""


class PatientAccessDeniedError(Exception):
    """Authenticated user cannot access the requested patient."""


class DataUnavailableError(Exception):
    """Required upstream data is unavailable."""


@dataclass(frozen=True)
class SupabaseUser:
    user_id: str
    email: str | None
    role: str
    department: str | None


class InputSanitizer:
    MAX_MESSAGE_LENGTH = 2000
    MAX_PATIENT_ID_LENGTH = 50
    MAX_CONVERSATION_ID_LENGTH = 100

    PATIENT_ID_PATTERN = re.compile(r"^[a-zA-Z0-9\-_]+$")
    CONVERSATION_ID_PATTERN = re.compile(r"^[a-zA-Z0-9\-_]+$")

    INJECTION_PATTERNS = [
        r"ignore\s+(previous|prior|above|all)\s+instructions?",
        r"you\s+are\s+now\s+(?:a\s+)?(?:different|new|another)",
        r"pretend\s+(?:you\s+are|to\s+be)",
        r"system\s*:\s*",
        r"<\s*system\s*>",
        r"\[INST\]",
        r"###\s*instruction",
        r"override\s+(?:your\s+)?(?:instructions?|guidelines?|rules?)",
        r"jailbreak",
        r"DAN\s+mode",
        r"developer\s+mode",
        r"ignore\s+(?:all\s+)?(?:safety|ethical)\s+(?:guidelines?|rules?)",
    ]

    def sanitize_message(self, message: str) -> str:
        if len(message) > self.MAX_MESSAGE_LENGTH:
            raise ValueError(f"Message exceeds {self.MAX_MESSAGE_LENGTH} characters")

        for pattern in self.INJECTION_PATTERNS:
            if re.search(pattern, message, re.IGNORECASE):
                raise SecurityViolationError("Message contains disallowed content")

        message = re.sub(r"<[^>]+>", "", message)
        message = " ".join(message.split())
        return message.strip()

    def sanitize_patient_id(self, patient_id: str | None) -> str | None:
        if patient_id is None:
            return None
        patient_id = patient_id.strip()
        if len(patient_id) > self.MAX_PATIENT_ID_LENGTH:
            raise ValueError("Patient ID too long")
        if not self.PATIENT_ID_PATTERN.match(patient_id):
            raise ValueError("Patient ID contains invalid characters")
        return patient_id

    def sanitize_conversation_id(self, conversation_id: str | None) -> str | None:
        if conversation_id is None:
            return None
        conversation_id = conversation_id.strip()
        if len(conversation_id) > self.MAX_CONVERSATION_ID_LENGTH:
            raise ValueError("Conversation ID too long")
        if not self.CONVERSATION_ID_PATTERN.match(conversation_id):
            raise ValueError("Conversation ID contains invalid characters")
        return conversation_id

    def sanitize_metadata(self, metadata: dict[str, Any] | None) -> dict[str, str]:
        allowed_metadata_keys = {"alert_id", "context_type"}
        return {
            key: str(value)[:200]
            for key, value in (metadata or {}).items()
            if key in allowed_metadata_keys
        }

    def sanitize_chat_request(self, request: ChatRequest) -> ChatRequest:
        return request.model_copy(
            update={
                "message": self.sanitize_message(request.message),
                "patient_id": self.sanitize_patient_id(request.patient_id),
                "conversation_id": self.sanitize_conversation_id(request.conversation_id),
                "metadata": self.sanitize_metadata(request.metadata),
            }
        )


async def verify_supabase_jwt(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> SupabaseUser:
    settings = get_settings()
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing authentication credentials")

    try:
        payload = _decode_supabase_jwt(credentials.credentials, settings)
    except jwt.PyJWTError as exc:
        logger.warning("supabase_jwt_verification_failed reason=%s", exc)
        raise HTTPException(status_code=401, detail="Invalid authentication credentials") from exc

    metadata = payload.get("user_metadata") or {}
    return SupabaseUser(
        user_id=str(payload.get("sub") or ""),
        email=payload.get("email"),
        role=str(metadata.get("role") or "doctor"),
        department=metadata.get("department"),
    )


def _decode_supabase_jwt(token: str, settings: Settings) -> dict[str, Any]:
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError:
        raise

    algorithm = header.get("alg")
    if algorithm == "HS256":
        if not settings.supabase_jwt_secret:
            raise jwt.InvalidTokenError("SUPABASE_JWT_SECRET is required for HS256 tokens")
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )

    if algorithm in JWKS_ALGORITHMS:
        jwks_url = settings.resolved_supabase_jwks_url
        if not jwks_url:
            raise jwt.InvalidTokenError("SUPABASE_JWKS_URL is required for asymmetric tokens")
        signing_key = jwt.PyJWKClient(jwks_url).get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=[algorithm],
            audience="authenticated",
        )

    raise jwt.InvalidAlgorithmError(f"Unsupported JWT algorithm: {algorithm}")


def sanitize_request_or_400(request: ChatRequest) -> ChatRequest:
    try:
        return InputSanitizer().sanitize_chat_request(request)
    except SecurityViolationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


async def authorize_chat_request(
    *,
    request: ChatRequest,
    user: SupabaseUser,
    patient_repository: PatientRepository,
) -> None:
    if _looks_like_summary_request(request):
        if user.role not in SUMMARY_ROLES:
            raise HTTPException(status_code=403, detail="Access denied")
    elif request.patient_id or request.metadata.get("alert_id"):
        if user.role not in ALLOWED_ROLES:
            raise HTTPException(status_code=403, detail="Access denied")
    elif user.role not in GENERAL_ROLES:
        raise HTTPException(status_code=403, detail="Access denied")

    if request.patient_id:
        await assert_patient_access(request.patient_id, user, patient_repository)


async def assert_patient_access(
    patient_id: str,
    user: SupabaseUser,
    patient_repository: PatientRepository,
) -> None:
    if user.role == "admin":
        return

    try:
        patient = patient_repository.get_by_id(patient_id)
    except RepositoryItemNotFoundError as exc:
        logger.warning(
            "patient_access_lookup_failed patient_id=%s repository=%s",
            patient_id,
            patient_repository.__class__.__name__,
        )
        raise HTTPException(status_code=404, detail="Patient not found") from exc

    patient_department = patient.get("department")
    if patient_department and user.department and patient_department != user.department:
        raise HTTPException(
            status_code=403,
            detail="Access denied: patient not in your department",
        )


def _looks_like_summary_request(request: ChatRequest) -> bool:
    text = request.message.lower()
    summary_terms = ["summary", "summarize", "tom tat", "tong quan", "tóm tắt", "tổng quan"]
    return bool(request.patient_id and any(term in text for term in summary_terms))
