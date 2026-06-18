from __future__ import annotations

from collections.abc import MutableMapping
from dataclasses import dataclass, field

from app.memory.short_term.policy import (
    SlidingWindowPolicy,
    append_safe_turns,
    build_memory_context,
    compact_if_needed,
)
from app.memory.short_term.state import (
    ChatMemoryState,
    MemoryTurn,
    initial_chat_memory_state,
)


@dataclass
class ShortTermMemoryManager:
    policy: SlidingWindowPolicy = field(default_factory=SlidingWindowPolicy)
    store: MutableMapping[str, ChatMemoryState] = field(default_factory=dict)

    def load_or_seed(
        self,
        *,
        patient_id: str,
        conversation_id: str,
        message: str,
        history_turns: list[MemoryTurn] | None = None,
    ) -> ChatMemoryState:
        state = self.store.get(conversation_id)
        if state is None:
            state = initial_chat_memory_state(
                patient_id=patient_id,
                conversation_id=conversation_id,
                current_message=message,
            )
            turns = history_turns or []
            state["raw_turns"] = list(turns)
            state["turn_count"] = len(turns)
            return state

        next_state = self.normalize_state(state)
        next_state["current_message"] = message
        return next_state

    def build_context(self, state: ChatMemoryState) -> str:
        return build_memory_context(self.normalize_state(state))

    def append_assistant_response(
        self,
        state: ChatMemoryState,
        *,
        assistant_message: str,
    ) -> ChatMemoryState:
        with_new_turns = append_safe_turns(
            state,
            user_message=state.get("current_message", ""),
            assistant_message=assistant_message,
        )
        return compact_if_needed(with_new_turns, self.policy)

    def save(self, conversation_id: str, state: ChatMemoryState) -> None:
        self.store[conversation_id] = state

    def normalize_state(self, state: ChatMemoryState) -> ChatMemoryState:
        normalized = initial_chat_memory_state(
            patient_id=state.get("patient_id", ""),
            conversation_id=state.get("conversation_id", ""),
            current_message=state.get("current_message", ""),
        )
        normalized.update(state)
        normalized["raw_turns"] = list(state.get("raw_turns", []))
        normalized["summary"] = state.get("summary", "")
        normalized["turn_count"] = int(state.get("turn_count", len(normalized["raw_turns"])))
        normalized["last_compacted_turn"] = int(state.get("last_compacted_turn", 0))
        normalized["safe_for_memory"] = bool(state.get("safe_for_memory", False))
        return normalized
