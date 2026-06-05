from dataclasses import dataclass
from typing import Any

from app.agents.clinical.prompts.builders import (
    build_chat_prompt,
    build_explain_alert_prompt,
    build_general_chat_prompt,
    build_summary_prompt,
)


@dataclass(frozen=True)
class ClinicalAgent:
    def build_summary_prompt(self, patient: dict[str, Any]) -> str:
        return build_summary_prompt(patient)

    def build_explain_alert_prompt(self, alert: dict[str, Any], patient: dict[str, Any]) -> str:
        return build_explain_alert_prompt(alert, patient)

    def build_chat_prompt(
        self,
        *,
        patient: dict[str, Any],
        message: str,
        conversation_id: str | None,
        memory_context: str = "",
        long_term_watchlist: str = "",
        doctor_preferences: str = "",
    ) -> str:
        return build_chat_prompt(
            patient=patient,
            message=message,
            conversation_id=conversation_id,
            memory_context=memory_context,
            long_term_watchlist=long_term_watchlist,
            doctor_preferences=doctor_preferences,
        )

    def build_general_chat_prompt(self, *, message: str) -> str:
        return build_general_chat_prompt(message=message)
