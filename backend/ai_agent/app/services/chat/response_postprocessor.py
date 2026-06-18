from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.contracts.agent_response import AgentResponse
from app.services.intent import ChatIntent


@dataclass(frozen=True)
class ChatResponsePostprocessor:
    def process(self, response: AgentResponse, state: dict[str, Any]) -> AgentResponse:
        if state.get("selected_intent") == ChatIntent.GENERAL_MEDICAL_QA.value:
            from app.services.clinical.citation_validator import validate_and_format_citations

            response.narrative_summary = validate_and_format_citations(
                narrative_summary=response.narrative_summary,
                tool_output=state.get("tool_output"),
            )
        return response
