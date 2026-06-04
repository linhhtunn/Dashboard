from __future__ import annotations

from dataclasses import dataclass

from app.memory.summarizer import compact_summary
from app.memory.short_term.state import ChatMemoryState


@dataclass(frozen=True)
class SlidingWindowPolicy:
    compact_turn_threshold: int = 6
    overlap_turns: int = 2

    def __post_init__(self) -> None:
        if self.compact_turn_threshold < 2:
            raise ValueError("compact_turn_threshold must be at least 2")
        if self.overlap_turns < 1:
            raise ValueError("overlap_turns must be at least 1")
        if self.overlap_turns >= self.compact_turn_threshold:
            raise ValueError("overlap_turns must be lower than compact_turn_threshold")


def build_memory_context(state: ChatMemoryState) -> str:
    summary = state.get("summary", "").strip()
    raw_turns = state.get("raw_turns", [])

    lines: list[str] = []
    if summary:
        lines.append("Conversation summary:")
        lines.append(summary)
    else:
        lines.append("Conversation summary: none yet.")

    if raw_turns:
        lines.append("Recent raw turns:")
        lines.extend(f"- {turn['role']}: {turn['content']}" for turn in raw_turns)
    else:
        lines.append("Recent raw turns: none yet.")

    return "\n".join(lines)


def append_safe_turns(
    state: ChatMemoryState,
    *,
    user_message: str,
    assistant_message: str,
) -> ChatMemoryState:
    next_state = dict(state)
    raw_turns = list(state.get("raw_turns", []))
    raw_turns.append({"role": "user", "content": user_message})
    raw_turns.append({"role": "assistant", "content": assistant_message})
    next_state["raw_turns"] = raw_turns
    next_state["turn_count"] = int(state.get("turn_count", 0)) + 2
    return next_state  # type: ignore[return-value]


def compact_if_needed(
    state: ChatMemoryState,
    policy: SlidingWindowPolicy,
) -> ChatMemoryState:
    raw_turns = list(state.get("raw_turns", []))
    if len(raw_turns) <= policy.compact_turn_threshold:
        return state

    turns_to_summarize = raw_turns[:-policy.overlap_turns]
    kept_turns = raw_turns[-policy.overlap_turns:]
    previous_summary = state.get("summary", "")
    next_summary = compact_summary(previous_summary, turns_to_summarize)

    next_state = dict(state)
    next_state["summary"] = next_summary
    next_state["raw_turns"] = kept_turns
    next_state["last_compacted_turn"] = int(state.get("turn_count", 0)) - len(kept_turns)
    return next_state  # type: ignore[return-value]
