from __future__ import annotations

import hashlib
import logging
import os
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any, Iterator

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)

PATIENT_ID_MODES = {"hash", "masked", "raw", "none"}
DEFAULT_HASH_SALT = "ai-agent-langfuse-patient-id"
SAFE_OBSERVATION_OUTPUT_MARKER = "_langfuse_safe_output"


@dataclass
class NoOpObservation:
    name: str
    metadata: dict[str, Any] = field(default_factory=dict)
    output: Any | None = None
    usage_details: dict[str, int] | None = None
    model: str | None = None

    def update(self, **kwargs: Any) -> None:
        metadata = kwargs.get("metadata")
        if isinstance(metadata, dict):
            self.metadata.update(metadata)
        if "output" in kwargs:
            self.output = kwargs["output"]
        usage_details = kwargs.get("usage_details")
        if isinstance(usage_details, dict):
            self.usage_details = usage_details
        model = kwargs.get("model")
        if isinstance(model, str):
            self.model = model


@dataclass
class RecordingTracer:
    settings: Settings
    records: list[dict[str, Any]] = field(default_factory=list)

    @contextmanager
    def observe(
        self,
        *,
        name: str,
        as_type: str = "span",
        metadata: dict[str, Any] | None = None,
        input: Any | None = None,
    ) -> Iterator[NoOpObservation]:
        observation = NoOpObservation(name=name, metadata=sanitize_metadata(metadata or {}, self.settings))
        try:
            yield observation
        finally:
            self.records.append(
                {
                    "name": name,
                    "as_type": as_type,
                    "metadata": dict(observation.metadata),
                    "input": summarize_content(input, self.settings),
                    "output": summarize_content(observation.output, self.settings),
                    "usage_details": observation.usage_details,
                    "model": observation.model,
                }
            )


class LangfuseTracer:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._client: Any | None = None
        self._loaded = False

    @property
    def enabled(self) -> bool:
        return bool(
            self.settings.langfuse_enabled
            and self.settings.langfuse_public_key
            and self.settings.langfuse_secret_key
        )

    @contextmanager
    def observe(
        self,
        *,
        name: str,
        as_type: str = "span",
        metadata: dict[str, Any] | None = None,
        input: Any | None = None,
    ) -> Iterator[NoOpObservation]:
        client = self._client_or_none()
        safe_metadata = sanitize_metadata(metadata or {}, self.settings)
        safe_input = summarize_content(input, self.settings)
        if client is None:
            yield NoOpObservation(name=name, metadata=safe_metadata)
            return

        try:
            context = client.start_as_current_observation(
                name=name,
                as_type=as_type,
                metadata=safe_metadata,
                input=safe_input,
            )
            observation = context.__enter__()
        except Exception as exc:
            logger.debug("langfuse_observe_failed name=%s error_type=%s", name, exc.__class__.__name__)
            yield NoOpObservation(name=name, metadata=safe_metadata)
            return

        try:
            yield _LangfuseObservation(name=name, observation=observation, settings=self.settings)
        finally:
            try:
                context.__exit__(None, None, None)
            except Exception as exc:
                logger.debug("langfuse_close_failed name=%s error_type=%s", name, exc.__class__.__name__)

    def _client_or_none(self) -> Any | None:
        if self._loaded:
            return self._client
        self._loaded = True
        if not self.enabled:
            return None
        try:
            os.environ.setdefault("LANGFUSE_PUBLIC_KEY", self.settings.langfuse_public_key or "")
            os.environ.setdefault("LANGFUSE_SECRET_KEY", self.settings.langfuse_secret_key or "")
            os.environ.setdefault("LANGFUSE_BASE_URL", self.settings.resolved_langfuse_base_url)
            from langfuse import get_client  # type: ignore

            self._client = get_client()
        except Exception as exc:
            logger.info("langfuse_client_unavailable error_type=%s", exc.__class__.__name__)
            self._client = None
        return self._client


class _LangfuseObservation(NoOpObservation):
    def __init__(self, *, name: str, observation: Any, settings: Settings) -> None:
        super().__init__(name=name)
        self._observation = observation
        self._settings = settings

    def update(self, **kwargs: Any) -> None:
        super().update(**kwargs)
        safe_kwargs = dict(kwargs)
        if isinstance(safe_kwargs.get("metadata"), dict):
            safe_kwargs["metadata"] = sanitize_metadata(safe_kwargs["metadata"], self._settings)
        if "input" in safe_kwargs:
            safe_kwargs["input"] = summarize_content(safe_kwargs["input"], self._settings)
        if "output" in safe_kwargs:
            safe_kwargs["output"] = summarize_content(safe_kwargs["output"], self._settings)
        try:
            self._observation.update(**safe_kwargs)
        except Exception as exc:
            logger.debug("langfuse_update_failed name=%s error_type=%s", self.name, exc.__class__.__name__)


_tracer_override: Any | None = None


def configure_tracer_for_testing(tracer: Any) -> None:
    global _tracer_override
    _tracer_override = tracer


def reset_tracer_for_testing() -> None:
    global _tracer_override
    _tracer_override = None


@contextmanager
def observe(
    *,
    name: str,
    as_type: str = "span",
    metadata: dict[str, Any] | None = None,
    input: Any | None = None,
) -> Iterator[NoOpObservation]:
    tracer = _tracer_override or LangfuseTracer()
    with tracer.observe(name=name, as_type=as_type, metadata=metadata, input=input) as observation:
        yield observation


def sanitize_metadata(metadata: dict[str, Any], settings: Settings | None = None) -> dict[str, Any]:
    settings = settings or get_settings()
    sanitized: dict[str, Any] = {}
    for key, value in metadata.items():
        if key == "patient_id":
            sanitized[key] = sanitize_patient_id(value, settings)
        elif isinstance(value, dict):
            sanitized[key] = sanitize_metadata(value, settings)
        else:
            sanitized[key] = value
    return sanitized


def sanitize_patient_id(patient_id: Any, settings: Settings | None = None) -> str | None:
    if patient_id in (None, ""):
        return None
    settings = settings or get_settings()
    patient_id = str(patient_id)
    mode = (settings.langfuse_patient_id_mode or "hash").lower()
    if mode not in PATIENT_ID_MODES:
        mode = "hash"
    if mode == "none":
        return None
    if mode == "raw":
        return patient_id
    if mode == "masked":
        return patient_id[:4] + ("*" * max(len(patient_id) - 4, 0))
    salt = settings.langfuse_hash_salt or DEFAULT_HASH_SALT
    return hashlib.sha256(f"{salt}:{patient_id}".encode("utf-8")).hexdigest()[:16]


def summarize_content(value: Any, settings: Settings | None = None) -> Any:
    settings = settings or get_settings()
    if value is None:
        return None
    if isinstance(value, dict) and value.get(SAFE_OBSERVATION_OUTPUT_MARKER) is True:
        return {key: item for key, item in value.items() if key != SAFE_OBSERVATION_OUTPUT_MARKER}
    if settings.langfuse_capture_content:
        return value
    if isinstance(value, str):
        return {"content_length": len(value), "content_sha256": hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]}
    return {"content_type": type(value).__name__, "content_redacted": True}


maybe_capture_content = summarize_content
