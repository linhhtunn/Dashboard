import pytest

from app.memory.policy import SlidingWindowPolicy, append_safe_turns, compact_if_needed
from app.memory.state import initial_chat_memory_state


def test_compaction_keeps_overlap_and_summarizes_prefix() -> None:
    state = initial_chat_memory_state(
        patient_id="P001",
        conversation_id="CONV_P001_001",
        current_message="turn 7",
    )
    for index in range(1, 8):
        state = append_safe_turns(
            state,
            user_message=f"user {index}",
            assistant_message=f"assistant {index}",
        )

    compacted = compact_if_needed(
        state,
        SlidingWindowPolicy(compact_turn_threshold=6, overlap_turns=2),
    )

    assert "user 1" in compacted["summary"]
    assert "assistant 6" in compacted["summary"]
    assert compacted["raw_turns"] == [
        {"role": "user", "content": "user 7"},
        {"role": "assistant", "content": "assistant 7"},
    ]
    assert compacted["last_compacted_turn"] == 12


def test_policy_rejects_overlap_equal_to_threshold() -> None:
    with pytest.raises(ValueError):
        SlidingWindowPolicy(compact_turn_threshold=2, overlap_turns=2)
