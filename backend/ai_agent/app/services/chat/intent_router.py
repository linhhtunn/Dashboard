from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.services.intent import ChatIntent


INTENT_TOOL_MAP = {
    ChatIntent.PATIENT_SUMMARY: "clinical.patient_summary_context",
    ChatIntent.EXPLAIN_ALERT: "clinical.alert_explanation_context",
    ChatIntent.MEDICATION_RECOMMENDATION: "clinical.medication_recommendation_context",
    ChatIntent.VITALS_TREND: "clinical.vitals_trend_context",
    ChatIntent.DOCTOR_PATIENT_OVERVIEW: "clinical.doctor_patient_overview_context",
    ChatIntent.PATIENT_LOOKUP: "clinical.patient_search_context",
    ChatIntent.GENERAL_MEDICAL_QA: "clinical.medical_search_tool",
}

DOCTOR_SCOPED_INTENTS = {
    ChatIntent.DOCTOR_PATIENT_OVERVIEW,
    ChatIntent.PATIENT_LOOKUP,
}

PATIENT_SCOPED_INTENTS = {
    ChatIntent.PATIENT_SUMMARY,
    ChatIntent.EXPLAIN_ALERT,
    ChatIntent.MEDICATION_RECOMMENDATION,
    ChatIntent.VITALS_TREND,
}


@dataclass(frozen=True)
class ChatIntentRouter:
    def tool_name_for_intent(self, intent: ChatIntent) -> str | None:
        return INTENT_TOOL_MAP.get(intent)

    def selected_tool_name(self, state: dict[str, Any]) -> str | None:
        intent = self._intent_from_state(state)
        if intent is None:
            return None
        return self.tool_name_for_intent(intent)

    def route_after_intent(self, state: dict[str, Any]) -> str:
        if state.get("needs_clarification"):
            return "generate"
        return "tool" if self.selected_tool_name(state) else "generate"

    def intent_requires_patient(self, state: dict[str, Any]) -> bool:
        intent = self._intent_from_state(state)
        if intent is None:
            return True
        return intent in PATIENT_SCOPED_INTENTS

    def doctor_scoped_response_is_safe_for_memory(self, state: dict[str, Any]) -> bool:
        intent = self._intent_from_state(state)
        if intent is None or intent not in DOCTOR_SCOPED_INTENTS:
            return True
        tool_output = state.get("tool_output") or {}
        data = tool_output.get("data") or {}
        if intent == ChatIntent.PATIENT_LOOKUP and data.get("match_status") == "multiple":
            return False
        return True

    def _intent_from_state(self, state: dict[str, Any]) -> ChatIntent | None:
        try:
            return ChatIntent(state.get("selected_intent") or ChatIntent.GENERAL_CHAT)
        except ValueError:
            return None
