from dataclasses import dataclass
from typing import Any

from app.api.schemas.agent_requests import ChatMessage
from app.services.prompt_builder import (
    build_chat_prompt,
    build_explain_alert_prompt,
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
        history: list[ChatMessage],
        conversation_id: str | None,
        memory_context: str = "",
    ) -> str:
        return build_chat_prompt(
            patient=patient,
            message=message,
            history=history,
            conversation_id=conversation_id,
            memory_context=memory_context,
        )
