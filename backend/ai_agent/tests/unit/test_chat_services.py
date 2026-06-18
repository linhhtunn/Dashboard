from __future__ import annotations

from typing import Any

import pytest

from app.contracts import tool_error, tool_success
from app.contracts.agent_response import AgentResponse
from app.repositories.ports import RepositoryItemNotFoundError
from app.services.chat import (
    ChatIntentRouter,
    ChatPromptBuilder,
    ChatResponsePostprocessor,
    ChatToolContextRunner,
    PatientContextResolver,
)
from app.services.intent import ChatIntent
from app.tools import ToolContext, ToolRegistry, ToolRequest


def response_payload(*, narrative_summary: str = "Theo guideline [1].") -> dict[str, Any]:
    return {
        "schema_version": "v1",
        "response_type": "chat",
        "patient_id": None,
        "source_id": "CONV",
        "narrative_summary": narrative_summary,
        "visualizations": {
            "has_chart": False,
            "chart_type": "time-series",
            "chart_title": "",
            "data_points": [],
        },
        "comparisons": {
            "has_comparison": False,
            "comparison_type": "vitals-trend",
            "headers": [],
            "rows": [],
        },
    }


def test_intent_router_routes_tool_intents_and_patient_scope() -> None:
    router = ChatIntentRouter()

    assert router.route_after_intent({"selected_intent": ChatIntent.PATIENT_SUMMARY.value}) == "tool"
    assert router.selected_tool_name(
        {"selected_intent": ChatIntent.PATIENT_SUMMARY.value}
    ) == "clinical.patient_summary_context"
    assert router.route_after_intent({"selected_intent": ChatIntent.GENERAL_CHAT.value}) == "generate"
    assert router.route_after_intent(
        {
            "selected_intent": ChatIntent.PATIENT_SUMMARY.value,
            "needs_clarification": True,
        }
    ) == "generate"
    assert router.intent_requires_patient({"selected_intent": ChatIntent.PATIENT_SUMMARY.value}) is True
    assert router.intent_requires_patient({"selected_intent": ChatIntent.GENERAL_CHAT.value}) is False
    assert router.intent_requires_patient(
        {"selected_intent": ChatIntent.DOCTOR_PATIENT_OVERVIEW.value}
    ) is False


def test_intent_router_blocks_ambiguous_patient_lookup_memory() -> None:
    router = ChatIntentRouter()

    assert router.doctor_scoped_response_is_safe_for_memory(
        {
            "selected_intent": ChatIntent.PATIENT_LOOKUP.value,
            "tool_output": {"data": {"match_status": "multiple"}},
        }
    ) is False
    assert router.doctor_scoped_response_is_safe_for_memory(
        {
            "selected_intent": ChatIntent.PATIENT_LOOKUP.value,
            "tool_output": {"data": {"match_status": "single"}},
        }
    ) is True


class RecordingTool:
    name = "clinical.patient_summary_context"
    description = "records request and context"

    def __init__(self, data: dict[str, Any], *, error: bool = False) -> None:
        self.data = data
        self.error = error
        self.requests: list[ToolRequest] = []
        self.contexts: list[ToolContext | None] = []

    async def run(
        self,
        request: ToolRequest,
        context: ToolContext | None = None,
    ):
        self.requests.append(request)
        self.contexts.append(context)
        if self.error:
            return tool_error(tool_name=self.name, message="tool failed", data=self.data)
        return tool_success(tool_name=self.name, data=self.data, message="tool ok")


@pytest.mark.asyncio
async def test_tool_context_runner_executes_selected_tool_and_maps_success_data() -> None:
    data = {
        "data_availability": {"recent_vitals": True},
        "clinical_features": {"cha2ds2_vasc": 2},
        "allowed_drugs": ["apixaban"],
        "blocked_drugs": {"warfarin": "not indicated"},
        "triggered_rules": [{"id": "RULE"}],
        "retrieved_evidence": ["evidence"],
        "vitals_summary": {"heart_rate": "normal"},
        "actions": [{"type": "select_patient_for_chat", "label": "Open"}],
    }
    tool = RecordingTool(data)
    registry = ToolRegistry()
    registry.register(tool)
    runner = ChatToolContextRunner(registry)

    updates = await runner.run(
        {
            "selected_intent": ChatIntent.PATIENT_SUMMARY.value,
            "intent_arguments": {},
            "patient_id": "P001",
            "conversation_id": "CONV",
            "current_message": "Tom tat benh nhan",
        }
    )

    assert tool.requests[0].arguments["patient_id"] == "P001"
    assert tool.requests[0].arguments["query"] == "Tom tat benh nhan"
    assert tool.contexts[0].patient_id == "P001"
    assert tool.contexts[0].metadata == {"intent": ChatIntent.PATIENT_SUMMARY.value}
    assert updates["data_availability"] == {"recent_vitals": True}
    assert updates["clinical_features"] == {"cha2ds2_vasc": 2}
    assert updates["allowed_drugs"] == ["apixaban"]
    assert updates["actions"][0]["type"] == "select_patient_for_chat"


@pytest.mark.asyncio
async def test_tool_context_runner_maps_error_data_availability() -> None:
    tool = RecordingTool({"data_availability": {"vitals": False}}, error=True)
    registry = ToolRegistry()
    registry.register(tool)
    runner = ChatToolContextRunner(registry)

    updates = await runner.run(
        {
            "selected_intent": ChatIntent.PATIENT_SUMMARY.value,
            "patient_id": "P001",
            "current_message": "Tom tat",
        }
    )

    assert updates["tool_output"]["status"] == "error"
    assert updates["data_availability"] == {"vitals": False}


class FakePatientRepository:
    def __init__(self) -> None:
        self.patients = {"P001": {"patient_id": "P001", "name": "Patient One"}}

    def get_by_id(self, patient_id: str) -> dict[str, Any]:
        try:
            return self.patients[patient_id]
        except KeyError as exc:
            raise RepositoryItemNotFoundError(patient_id) from exc


def test_patient_context_resolver_returns_real_patient() -> None:
    resolver = PatientContextResolver(FakePatientRepository())

    assert resolver.resolve({"patient_id": "P001"}) == {"patient_id": "P001", "name": "Patient One"}


def test_patient_context_resolver_returns_doctor_scoped_context_without_patient() -> None:
    resolver = PatientContextResolver(FakePatientRepository())

    patient = resolver.resolve({"doctor_id": "D7"})

    assert patient["patient_id"] is None
    assert patient["scope"] == "doctor_patient_list"
    assert patient["doctor_id"] == "D7"


class RecordingClinicalAgent:
    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    def build_chat_prompt(self, **kwargs) -> str:
        self.calls.append(kwargs)
        return "prompt"


def test_prompt_builder_uses_same_state_fields_for_repeated_calls() -> None:
    agent = RecordingClinicalAgent()
    builder = ChatPromptBuilder(agent)
    state = {
        "current_message": "message",
        "conversation_id": "CONV",
        "memory_context": "memory",
        "long_term_watchlist": "watchlist",
        "doctor_preferences": "prefs",
        "clinical_features": {"feature": True},
        "allowed_drugs": ["apixaban"],
        "blocked_drugs": {},
        "vitals_summary": {"hr": 80},
        "retrieved_evidence": ["evidence"],
        "selected_intent": ChatIntent.PATIENT_SUMMARY.value,
        "intent_arguments": {"patient_id": "P001"},
        "tool_output": {"data": {}},
        "data_availability": {"recent_vitals": True},
        "actions": [{"type": "select_patient_for_chat"}],
        "needs_clarification": True,
        "clarifying_question": "Which patient?",
    }
    patient = {"patient_id": "P001"}

    assert builder.build(state=state, patient=patient) == "prompt"
    assert builder.build(state=state, patient=patient) == "prompt"
    assert agent.calls[0] == agent.calls[1]
    assert agent.calls[0]["patient"] == patient
    assert agent.calls[0]["clinical_features"] == {"feature": True}
    assert agent.calls[0]["clarifying_question"] == "Which patient?"


def test_response_postprocessor_formats_general_medical_qa_citations() -> None:
    response = AgentResponse.model_validate(response_payload())
    state = {
        "selected_intent": ChatIntent.GENERAL_MEDICAL_QA.value,
        "tool_output": {
            "data": {
                "raw_search_results": [
                    {"title": "Guideline", "url": "https://example.test/guideline"}
                ]
            }
        },
    }

    processed = ChatResponsePostprocessor().process(response, state)

    assert "Tài liệu tham khảo:" in processed.narrative_summary
    assert "- [1] [Guideline](https://example.test/guideline)" in processed.narrative_summary


def test_response_postprocessor_leaves_non_medical_qa_response_unchanged() -> None:
    response = AgentResponse.model_validate(response_payload(narrative_summary="No citations [9]."))

    processed = ChatResponsePostprocessor().process(
        response,
        {
            "selected_intent": ChatIntent.GENERAL_CHAT.value,
            "tool_output": {"data": {"raw_search_results": []}},
        },
    )

    assert processed.narrative_summary == "No citations [9]."
