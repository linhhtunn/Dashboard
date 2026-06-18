from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.agents.clinical import ClinicalAgent


@dataclass(frozen=True)
class ChatPromptBuilder:
    clinical_agent: ClinicalAgent

    def build(self, *, state: dict[str, Any], patient: dict[str, Any]) -> str:
        return self.clinical_agent.build_chat_prompt(
            patient=patient,
            message=state.get("current_message", ""),
            conversation_id=state.get("conversation_id"),
            memory_context=state.get("memory_context", ""),
            long_term_watchlist=state.get("long_term_watchlist", ""),
            doctor_preferences=state.get("doctor_preferences", ""),
            clinical_features=state.get("clinical_features"),
            allowed_drugs=state.get("allowed_drugs"),
            blocked_drugs=state.get("blocked_drugs"),
            vitals_summary=state.get("vitals_summary"),
            retrieved_evidence=state.get("retrieved_evidence"),
            selected_intent=state.get("selected_intent"),
            intent_arguments=state.get("intent_arguments"),
            tool_output=state.get("tool_output"),
            data_availability=state.get("data_availability"),
            actions=state.get("actions"),
            needs_clarification=state.get("needs_clarification", False),
            clarifying_question=state.get("clarifying_question"),
        )
