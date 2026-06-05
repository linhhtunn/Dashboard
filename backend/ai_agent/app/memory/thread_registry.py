from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from threading import Lock
from typing import Any


def utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


@dataclass
class ThreadRecord:
    conversation_id: str
    doctor_id: str
    patient_id: str | None
    title: str
    last_message_at: str
    last_issue: str | None = None
    last_intent: str | None = None
    messages: list[dict[str, str]] = field(default_factory=list)


class ThreadRegistry:
    def __init__(self) -> None:
        self._records: dict[str, ThreadRecord] = {}
        self._lock = Lock()

    def upsert(
        self,
        *,
        conversation_id: str,
        doctor_id: str,
        patient_id: str | None,
        title: str,
        last_issue: str | None,
        last_intent: str | None,
        messages: list[dict[str, str]] | None = None,
    ) -> ThreadRecord:
        with self._lock:
            current = self._records.get(conversation_id)
            record = ThreadRecord(
                conversation_id=conversation_id,
                doctor_id=doctor_id,
                patient_id=patient_id,
                title=title,
                last_message_at=utc_now_iso(),
                last_issue=last_issue,
                last_intent=last_intent,
                messages=messages or current.messages if current else messages or [],
            )
            self._records[conversation_id] = record
            return record

    def list(self, *, doctor_id: str | None = None, patient_id: str | None = None) -> list[ThreadRecord]:
        with self._lock:
            values = list(self._records.values())

        if doctor_id:
            values = [item for item in values if item.doctor_id == doctor_id]
        if patient_id:
            values = [item for item in values if item.patient_id == patient_id]

        return sorted(values, key=lambda item: item.last_message_at, reverse=True)

    def get(self, conversation_id: str) -> ThreadRecord | None:
        with self._lock:
            return self._records.get(conversation_id)
