import json
from typing import Any

import pytest

from app.agents.clinical import ClinicalAgent
from app.api.schemas.agent_requests import ChatRequest
from app.contracts import tool_error
from app.contracts.agent_response import ResponseType
from app.core.config import Settings
from app.memory.workflow import ChatMemoryWorkflow
from app.observability import RecordingTracer, configure_tracer_for_testing, reset_tracer_for_testing
from app.repositories.fixtures import FixturePatientRepository
from app.repositories.ports import RepositoryItemNotFoundError
from app.services.generation import GenerationService
from app.tools import ToolRegistry
from app.tools.clinical import VitalsTrendContextTool
from app.workflows import ChatWorkflow
from tests.workflow.test_agent_service import FakeLLM, contract_payload


class FakePatientRepository:
    def __init__(self, patients: dict[str, dict[str, Any]]) -> None:
        self.patients = patients

    def get_by_id(self, patient_id: str) -> dict[str, Any]:
        try:
            return self.patients[patient_id]
        except KeyError as exc:
            raise RepositoryItemNotFoundError(patient_id) from exc


class FailingVitalsTool:
    name = "clinical.get_patient_vitals_summary"
    description = "fake missing vitals table"

    async def run(self, request, context=None):
        return tool_error(tool_name=self.name, message="relation clean_vitals does not exist")


def log_fallback(*, endpoint, response, patient_id, reason):
    return response


def af_patient() -> dict[str, Any]:
    return {
        "patient_id": "P_AF",
        "name": "AF Patient",
        "age": 72,
        "gender": "Nam",
        "medical_history": "Rung nhĩ (AF), Tăng huyết áp",
        "recent_vitals": [],
        "recent_alerts": [],
        "weight_kg": 72.0,
        "serum_creatinine": 1.0,
        "is_af_confirmed": True,
        "has_heart_failure": False,
        "has_hypertension": True,
        "has_stroke_history": False,
        "has_vascular_disease": False,
        "has_diabetes": False,
        "has_mechanical_valve": False,
        "current_medications": [],
    }


def hypertension_patient() -> dict[str, Any]:
    patient = af_patient()
    patient.update(
        {
            "patient_id": "P_HTN",
            "name": "Hypertension Patient",
            "is_af_confirmed": False,
            "has_hypertension": True,
            "has_diabetes": True,
            "recent_vitals": [
                {
                    "timestamp": "2026-05-28T10:00:00Z",
                    "systolic_bp": 158,
                    "diastolic_bp": 96,
                    "heart_rate": 82,
                    "spo2": 97,
                    "status": "WARNING",
                }
            ],
        }
    )
    return patient


def make_workflow(patient_repository=None, tool_registry=None, outputs=None) -> ChatWorkflow:
    from langgraph.checkpoint.memory import MemorySaver

    llm = FakeLLM(outputs or [json.dumps(contract_payload(response_type="chat", source_id="CONV"))])
    return ChatWorkflow(
        patient_repository=patient_repository or FixturePatientRepository(),
        clinical_agent=ClinicalAgent(),
        generation_service=GenerationService(llm),
        memory_workflow=ChatMemoryWorkflow(checkpointer=MemorySaver()),
        log_fallback=log_fallback,
        tool_registry=tool_registry,
    )


@pytest.mark.asyncio
async def test_chat_routes_doctor_patient_overview_without_patient_id() -> None:
    payload = contract_payload(response_type="chat", patient_id=None, source_id="CONV_OVERVIEW")
    payload["actions"] = [
        {
            "type": "select_patient_for_chat",
            "label": "Mo benh nhan nay",
            "patient_id": "P001",
            "hospital_patient_code": "P001",
            "display_name": "Nguyen Van A",
        }
    ]
    workflow = make_workflow(outputs=[json.dumps(payload)])

    response = await workflow.run(
        ChatRequest(
            conversation_id="CONV_OVERVIEW",
            message="Hôm nay có những bệnh nhân nào nguy hiểm cần theo dõi?",
        )
    )

    state = workflow._graph.get_state(config={"configurable": {"thread_id": "CONV_OVERVIEW"}}).values
    assert response.response_type == ResponseType.CHAT
    assert response.patient_id is None
    assert response.actions[0].type == "select_patient_for_chat"
    assert state["selected_intent"] == "doctor_patient_overview"
    assert state["actions"]


@pytest.mark.asyncio
async def test_chat_routes_patient_lookup_without_patient_id() -> None:
    payload = contract_payload(response_type="chat", patient_id=None, source_id="CONV_LOOKUP")
    payload["actions"] = [
        {
            "type": "select_patient_for_chat",
            "label": "Mo benh nhan nay",
            "patient_id": "P001",
            "hospital_patient_code": "P001",
            "display_name": "Nguyen Van A",
        }
    ]
    workflow = make_workflow(outputs=[json.dumps(payload)])

    response = await workflow.run(
        ChatRequest(
            conversation_id="CONV_LOOKUP",
            message="Tìm bệnh nhân Nguyễn Văn A",
        )
    )

    state = workflow._graph.get_state(config={"configurable": {"thread_id": "CONV_LOOKUP"}}).values
    assert response.patient_id is None
    assert state["selected_intent"] == "patient_lookup"
    assert state["tool_output"]["data"]["match_status"] == "multiple"
    assert {action["patient_id"] for action in state["actions"]} == {"P001", "P003"}


@pytest.mark.asyncio
async def test_chat_workflow_records_intent_trace_without_changing_response() -> None:
    tracer = RecordingTracer(Settings(LANGFUSE_CAPTURE_CONTENT=False))
    configure_tracer_for_testing(tracer)
    try:
        payload = contract_payload(response_type="chat", patient_id=None, source_id="CONV_TRACE")
        workflow = make_workflow(outputs=[json.dumps(payload)])
        response = await workflow.run(
            ChatRequest(
                conversation_id="CONV_TRACE",
                message="Tìm bệnh nhân Nguyễn Văn A",
            )
        )
    finally:
        reset_tracer_for_testing()

    assert response.response_type == ResponseType.CHAT
    root_record = next(record for record in tracer.records if record["name"] == "chat.request")
    assert root_record["metadata"]["conversation_id"] == "CONV_TRACE"
    assert root_record["metadata"]["streaming"] is False
    record = next(record for record in tracer.records if record["name"] == "chat.intent.classify")
    assert record["metadata"]["selected_intent"] == "patient_lookup"
    assert record["metadata"]["patient_id"] is None
    assert record["metadata"]["route"] == "tool"
    assert record["metadata"]["tool_name"] == "clinical.patient_search_context"
    assert record["output"] == {
        "selected_intent": "patient_lookup",
        "confidence": record["metadata"]["confidence"],
        "needs_clarification": False,
        "route": "tool",
        "tool_name": "clinical.patient_search_context",
    }


@pytest.mark.asyncio
async def test_patient_scoped_request_without_patient_id_falls_back_without_llm_call() -> None:
    from langgraph.checkpoint.memory import MemorySaver

    llm = FakeLLM([json.dumps(contract_payload(response_type="chat", patient_id=None, source_id="CONV_MISSING"))])
    workflow = ChatWorkflow(
        patient_repository=FixturePatientRepository(),
        clinical_agent=ClinicalAgent(),
        generation_service=GenerationService(llm),
        memory_workflow=ChatMemoryWorkflow(checkpointer=MemorySaver()),
        log_fallback=log_fallback,
    )

    response = await workflow.run(
        ChatRequest(
            conversation_id="CONV_MISSING",
            message="Tóm tắt bệnh nhân này",
        )
    )

    state = workflow._graph.get_state(config={"configurable": {"thread_id": "CONV_MISSING"}}).values
    assert state["selected_intent"] == "patient_summary"
    assert llm.calls == 0
    assert response.patient_id is None
    assert "can gan voi mot benh nhan cu the" in response.narrative_summary


@pytest.mark.asyncio
async def test_chat_routes_patient_summary_intent() -> None:
    workflow = make_workflow(
        patient_repository=FakePatientRepository({"P_AF": af_patient()}),
        outputs=[json.dumps(contract_payload(response_type="chat", patient_id="P_AF", source_id="CONV_SUM"))],
    )

    response = await workflow.run(
        ChatRequest(patient_id="P_AF", conversation_id="CONV_SUM", message="Tóm tắt bệnh nhân")
    )

    state = workflow._graph.get_state(config={"configurable": {"thread_id": "CONV_SUM"}}).values
    assert response.response_type == ResponseType.CHAT
    assert state["selected_intent"] == "patient_summary"
    assert state["data_availability"]["recent_alerts"] is False
    assert state["data_availability"]["recent_vitals"] is False


@pytest.mark.asyncio
async def test_chat_routes_alert_explanation_with_metadata() -> None:
    workflow = make_workflow(
        outputs=[json.dumps(contract_payload(response_type="chat", patient_id="P001", source_id="CONV_ALERT"))],
    )

    await workflow.run(
        ChatRequest(
            patient_id="P001",
            conversation_id="CONV_ALERT",
            message="Giải thích cảnh báo này",
            metadata={"alert_id": "ALT_FALL_0092"},
        )
    )

    state = workflow._graph.get_state(config={"configurable": {"thread_id": "CONV_ALERT"}}).values
    assert state["selected_intent"] == "explain_alert"
    assert state["tool_output"]["data"]["alert"]["alert_id"] == "ALT_FALL_0092"


@pytest.mark.asyncio
async def test_chat_routes_medication_recommendation_intent() -> None:
    workflow = make_workflow(
        patient_repository=FakePatientRepository({"P_AF": af_patient()}),
        outputs=[json.dumps(contract_payload(response_type="chat", patient_id="P_AF", source_id="CONV_MED"))],
    )

    await workflow.run(
        ChatRequest(
            patient_id="P_AF",
            conversation_id="CONV_MED",
            message="Bệnh nhân này có thể dùng apixaban không?",
        )
    )

    state = workflow._graph.get_state(config={"configurable": {"thread_id": "CONV_MED"}}).values
    assert state["selected_intent"] == "medication_recommendation"
    assert state["clinical_features"]["cha2ds2_vasc"] == 2
    assert "apixaban" in state["allowed_drugs"]


@pytest.mark.asyncio
async def test_chat_routes_hypertension_medication_recommendation_intent() -> None:
    workflow = make_workflow(
        patient_repository=FakePatientRepository({"P_HTN": hypertension_patient()}),
        outputs=[json.dumps(contract_payload(response_type="chat", patient_id="P_HTN", source_id="CONV_HTN"))],
    )

    await workflow.run(
        ChatRequest(
            patient_id="P_HTN",
            conversation_id="CONV_HTN",
            message="Bệnh nhân tăng huyết áp nên cân nhắc thuốc gì?",
        )
    )

    state = workflow._graph.get_state(config={"configurable": {"thread_id": "CONV_HTN"}}).values
    assert state["selected_intent"] == "medication_recommendation"
    assert state["clinical_features"]["hypertension_stage"] == "stage_2"
    assert "ace_inhibitor" in state["allowed_drugs"]
    assert "warfarin" not in state["allowed_drugs"]


@pytest.mark.asyncio
async def test_chat_routes_vitals_missing_data_without_crashing() -> None:
    registry = ToolRegistry()
    registry.register(VitalsTrendContextTool(vitals_summary_tool=FailingVitalsTool()))
    workflow = make_workflow(
        tool_registry=registry,
        outputs=[json.dumps(contract_payload(response_type="chat", patient_id="P001", source_id="CONV_VITALS"))],
    )

    await workflow.run(
        ChatRequest(
            patient_id="P001",
            conversation_id="CONV_VITALS",
            message="Xu hướng nhịp tim 60 phút gần đây ra sao?",
        )
    )

    state = workflow._graph.get_state(config={"configurable": {"thread_id": "CONV_VITALS"}}).values
    assert state["selected_intent"] == "vitals_trend"
    assert state["data_availability"]["vitals"] is False
    assert "clean_vitals" in state["data_availability"]["notes"][0]


@pytest.mark.asyncio
async def test_chat_routes_general_message_without_tool() -> None:
    workflow = make_workflow(
        outputs=[json.dumps(contract_payload(response_type="chat", patient_id="P001", source_id="CONV_GENERAL"))],
    )

    await workflow.run(
        ChatRequest(
            patient_id="P001",
            conversation_id="CONV_GENERAL",
            message="Bệnh nhân hôm nay thế nào?",
        )
    )

    state = workflow._graph.get_state(config={"configurable": {"thread_id": "CONV_GENERAL"}}).values
    assert state["selected_intent"] == "general_chat"
    assert state.get("tool_output", {}) == {}


@pytest.mark.asyncio
async def test_chat_guards_non_clinical_question_without_llm_call() -> None:
    from langgraph.checkpoint.memory import MemorySaver

    llm = FakeLLM([json.dumps(contract_payload(response_type="chat", patient_id="P001", source_id="CONV_OOS"))])
    workflow = ChatWorkflow(
        patient_repository=FixturePatientRepository(),
        clinical_agent=ClinicalAgent(),
        generation_service=GenerationService(llm),
        memory_workflow=ChatMemoryWorkflow(checkpointer=MemorySaver()),
        log_fallback=log_fallback,
    )

    response = await workflow.run(
        ChatRequest(
            patient_id="P001",
            conversation_id="CONV_OOS",
            message="Thủ đô của Việt Nam ở đâu?",
        )
    )

    state = workflow._graph.get_state(config={"configurable": {"thread_id": "CONV_OOS"}}).values
    assert state["selected_intent"] == "out_of_scope"
    assert llm.calls == 0
    assert "ngoai pham vi lam sang" in response.narrative_summary


@pytest.mark.asyncio
async def test_patient_only_repository_supports_summary_and_medication_review() -> None:
    workflow = make_workflow(
        patient_repository=FakePatientRepository({"P_AF": af_patient()}),
        outputs=[
            json.dumps(contract_payload(response_type="chat", patient_id="P_AF", source_id="CONV_PATIENT_ONLY")),
            json.dumps(contract_payload(response_type="chat", patient_id="P_AF", source_id="CONV_PATIENT_ONLY_MED")),
        ],
    )

    summary = await workflow.run(
        ChatRequest(
            patient_id="P_AF",
            conversation_id="CONV_PATIENT_ONLY",
            message="Tóm tắt bệnh nhân",
        )
    )
    medication = await workflow.run(
        ChatRequest(
            patient_id="P_AF",
            conversation_id="CONV_PATIENT_ONLY_MED",
            message="Gợi ý thuốc kháng đông cho bệnh nhân này",
        )
    )

    summary_state = workflow._graph.get_state(
        config={"configurable": {"thread_id": "CONV_PATIENT_ONLY"}}
    ).values
    med_state = workflow._graph.get_state(
        config={"configurable": {"thread_id": "CONV_PATIENT_ONLY_MED"}}
    ).values
    assert summary.response_type == ResponseType.CHAT
    assert medication.response_type == ResponseType.CHAT
    assert summary_state["data_availability"]["recent_vitals"] is False
    assert "apixaban" in med_state["allowed_drugs"]


@pytest.mark.asyncio
async def test_chat_router_still_uses_contract_repair_retry_after_tool_execution() -> None:
    workflow = make_workflow(
        outputs=[
            "not json",
            json.dumps(contract_payload(response_type="chat", patient_id="P001", source_id="CONV_REPAIR")),
        ],
    )

    response = await workflow.run(
        ChatRequest(
            patient_id="P001",
            conversation_id="CONV_REPAIR",
            message="Tóm tắt bệnh nhân",
        )
    )

    assert response.response_type == ResponseType.CHAT
    assert response.source_id == "CONV_REPAIR"
