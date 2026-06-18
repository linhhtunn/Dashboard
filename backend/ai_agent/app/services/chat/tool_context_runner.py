from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from app.contracts import ToolResponse, ToolStatus
from app.services.chat.intent_router import ChatIntentRouter
from app.services.intent import ChatIntent
from app.tools import ToolContext, ToolRegistry, ToolRequest

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ChatToolContextRunner:
    tool_registry: ToolRegistry
    intent_router: ChatIntentRouter = field(default_factory=ChatIntentRouter)

    async def run(self, state: dict[str, Any]) -> dict[str, Any]:
        try:
            intent = ChatIntent(state.get("selected_intent") or ChatIntent.GENERAL_CHAT)
        except ValueError:
            return {}

        tool_name = self.intent_router.tool_name_for_intent(intent)
        if not tool_name:
            return {}

        intent_args = dict(state.get("intent_arguments") or {})
        intent_args["patient_id"] = intent_args.get("patient_id") or state.get("patient_id")
        intent_args["query"] = intent_args.get("query") or state.get("current_message", "")

        logger.info(
            "tool_execution_start tool_name=%s arguments=%s context_patient_id=%s",
            tool_name,
            intent_args,
            state.get("patient_id"),
        )
        response = await self.tool_registry.run(
            ToolRequest(name=tool_name, arguments=intent_args),
            ToolContext(
                patient_id=state.get("patient_id"),
                conversation_id=state.get("conversation_id"),
                metadata={"intent": intent.value},
            ),
        )
        logger.info(
            "tool_execution_completed tool_name=%s status=%s message=%s",
            tool_name,
            response.status.value,
            response.message,
        )
        return self.state_updates_from_tool_response(response)

    def state_updates_from_tool_response(self, response: ToolResponse) -> dict[str, Any]:
        tool_output = {
            "tool_name": response.tool_name,
            "status": response.status.value,
            "message": response.message,
            "data": response.data,
        }
        data = response.data if response.status in {ToolStatus.SUCCESS, ToolStatus.ERROR} else {}
        updates: dict[str, Any] = {
            "tool_output": tool_output,
            "data_availability": data.get("data_availability", {}),
        }
        if "clinical_features" in data:
            updates["clinical_features"] = data.get("clinical_features") or {}
        if "allowed_drugs" in data:
            updates["allowed_drugs"] = data.get("allowed_drugs") or []
        if "blocked_drugs" in data:
            updates["blocked_drugs"] = data.get("blocked_drugs") or {}
        if "triggered_rules" in data:
            updates["triggered_rules"] = data.get("triggered_rules") or []
        if "retrieved_evidence" in data:
            updates["retrieved_evidence"] = data.get("retrieved_evidence") or []
        if "vitals_summary" in data:
            updates["vitals_summary"] = data.get("vitals_summary") or {}
        if "actions" in data:
            updates["actions"] = data.get("actions") or []
        return updates
