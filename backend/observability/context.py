from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    return utc_now().isoformat().replace("+00:00", "Z")


@dataclass(frozen=True)
class TraceContext:
    run_id: str | None
    trace_id: str | None
    message_id: str | None
    patient_id: str | None
    alert_id: str | None = None
    abnormal_event_time: str | None = None

    @property
    def enabled(self) -> bool:
        return bool(self.run_id)


def payload_context(payload: dict[str, Any]) -> dict[str, Any]:
    context = payload.get("context")
    if isinstance(context, dict):
        return context
    return {}


def ensure_payload_context(payload: dict[str, Any]) -> dict[str, Any]:
    context = payload.get("context")
    if not isinstance(context, dict):
        context = {}
        payload["context"] = context
    return context


def trace_context_from_payload(payload: dict[str, Any], *, alert_id: str | None = None) -> TraceContext:
    context = payload_context(payload)
    message_id = payload.get("message_id")
    trace_id = context.get("trace_id") or message_id
    abnormal_event_time = (
        context.get("abnormal_event_time")
        or context.get("source_event_time")
        or payload.get("timestamp")
        or payload.get("window_start")
    )
    return TraceContext(
        run_id=context.get("run_id"),
        trace_id=str(trace_id) if trace_id is not None else None,
        message_id=str(message_id) if message_id is not None else None,
        patient_id=str(payload.get("patient_id")) if payload.get("patient_id") is not None else None,
        alert_id=alert_id,
        abnormal_event_time=str(abnormal_event_time) if abnormal_event_time is not None else None,
    )


def trace_context_from_alert(alert: dict[str, Any]) -> TraceContext:
    run_id = alert.get("_run_id") or alert.get("run_id")
    trace_id = alert.get("_trace_id") or alert.get("trace_id") or alert.get("source_event_id")
    message_id = alert.get("source_event_id")
    source_event_ids = alert.get("_source_event_ids") or []
    if message_id is None and source_event_ids:
        message_id = source_event_ids[0]
    abnormal_event_time = alert.get("_abnormal_event_time") or alert.get("abnormal_event_time") or alert.get("timestamp")
    return TraceContext(
        run_id=str(run_id) if run_id is not None else None,
        trace_id=str(trace_id) if trace_id is not None else None,
        message_id=str(message_id) if message_id is not None else None,
        patient_id=str(alert.get("patient_id")) if alert.get("patient_id") is not None else None,
        alert_id=str(alert.get("alert_id")) if alert.get("alert_id") is not None else None,
        abnormal_event_time=str(abnormal_event_time) if abnormal_event_time is not None else None,
    )
