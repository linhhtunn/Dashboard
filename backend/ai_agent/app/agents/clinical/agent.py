from dataclasses import dataclass
from typing import Any

from app.agents.clinical.prompts.builders import (
    build_chat_prompt,
)


@dataclass(frozen=True)
class ClinicalAgent:
    def build_chat_prompt(
        self,
        *,
        patient: dict[str, Any],
        message: str,
        conversation_id: str | None,
        memory_context: str = "",
        long_term_watchlist: str = "",
        doctor_preferences: str = "",
        clinical_features: dict[str, Any] | None = None,
        allowed_drugs: list[str] | None = None,
        blocked_drugs: dict[str, str] | None = None,
        vitals_summary: dict[str, Any] | None = None,
        retrieved_evidence: list[str] | None = None,
        selected_intent: str | None = None,
        intent_arguments: dict[str, Any] | None = None,
        tool_output: dict[str, Any] | None = None,
        data_availability: dict[str, Any] | None = None,
        actions: list[dict[str, Any]] | None = None,
        needs_clarification: bool = False,
        clarifying_question: str | None = None,
    ) -> str:
        return build_chat_prompt(
            patient=patient,
            message=message,
            conversation_id=conversation_id,
            memory_context=memory_context,
            long_term_watchlist=long_term_watchlist,
            doctor_preferences=doctor_preferences,
            clinical_features=clinical_features,
            allowed_drugs=allowed_drugs,
            blocked_drugs=blocked_drugs,
            vitals_summary=vitals_summary,
            retrieved_evidence=retrieved_evidence,
            selected_intent=selected_intent,
            intent_arguments=intent_arguments,
            tool_output=tool_output,
            data_availability=data_availability,
            actions=actions,
            needs_clarification=needs_clarification,
            clarifying_question=clarifying_question,
        )
