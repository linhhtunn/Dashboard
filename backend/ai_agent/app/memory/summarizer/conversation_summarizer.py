from __future__ import annotations

from app.memory.short_term.state import MemoryTurn


def compact_summary(previous_summary: str, turns: list[MemoryTurn]) -> str:
    if not turns:
        return previous_summary

    compacted_lines = [
        f"{turn['role']}: {_single_line(turn['content'])}"
        for turn in turns
    ]
    compacted = "\n".join(compacted_lines)
    if not previous_summary.strip():
        return f"Compacted prior conversation:\n{compacted}"
    return f"{previous_summary.strip()}\n\nAdditional compacted turns:\n{compacted}"


def _single_line(value: str) -> str:
    return " ".join(value.split())
