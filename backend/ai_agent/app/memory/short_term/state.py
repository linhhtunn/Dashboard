from __future__ import annotations

from typing import Literal, TypedDict

MemoryRole = Literal["user", "assistant"]


class MemoryTurn(TypedDict):
    role: MemoryRole
    content: str


class ChatMemoryState(TypedDict):
    patient_id: str
    conversation_id: str
    doctor_id: str
    summary: str
    raw_turns: list[MemoryTurn]
    turn_count: int
    last_compacted_turn: int
    memory_context: str
    long_term_watchlist: str
    doctor_preferences: str
    current_message: str
    response: object | None
    safe_for_memory: bool


def initial_chat_memory_state(
    *,
    patient_id: str,
    conversation_id: str,
    doctor_id: str = "D1",
    current_message: str = "",
) -> ChatMemoryState:
    return {
        "patient_id": patient_id,
        "conversation_id": conversation_id,
        "doctor_id": doctor_id,
        "summary": "",
        "raw_turns": [],
        "turn_count": 0,
        "last_compacted_turn": 0,
        "memory_context": "",
        "long_term_watchlist": "",
        "doctor_preferences": "",
        "current_message": current_message,
        "response": None,
        "safe_for_memory": False,
    }


def make_turn(*, role: MemoryRole, content: str) -> MemoryTurn:
    return {"role": role, "content": content}
