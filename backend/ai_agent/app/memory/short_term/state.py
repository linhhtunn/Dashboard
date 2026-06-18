from __future__ import annotations

from typing import Any, Literal, TypedDict

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
    request_metadata: dict[str, Any]
    response: object | None
    safe_for_memory: bool
    clinical_features: dict[str, Any]
    allowed_drugs: list[str]
    blocked_drugs: dict[str, str]
    vitals_summary: dict[str, Any]
    retrieved_evidence: list[str]
    triggered_rules: list[dict[str, Any]]
    selected_intent: str
    intent_confidence: float
    intent_arguments: dict[str, Any]
    needs_clarification: bool
    clarifying_question: str | None
    tool_output: dict[str, Any]
    data_availability: dict[str, Any]
    actions: list[dict[str, Any]]
    langfuse_trace_id: str | None



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
        "request_metadata": {},
        "response": None,
        "safe_for_memory": False,
        "clinical_features": {},
        "allowed_drugs": [],
        "blocked_drugs": {},
        "vitals_summary": {},
        "retrieved_evidence": [],
        "triggered_rules": [],
        "selected_intent": "general_chat",
        "intent_confidence": 0.0,
        "intent_arguments": {},
        "needs_clarification": False,
        "clarifying_question": None,
        "tool_output": {},
        "data_availability": {},
        "actions": [],
        "langfuse_trace_id": None,
    }


def make_turn(*, role: MemoryRole, content: str) -> MemoryTurn:
    return {"role": role, "content": content}
