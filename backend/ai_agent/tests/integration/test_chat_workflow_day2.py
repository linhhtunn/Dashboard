import json
import pytest
from typing import Any

from app.agents.clinical import ClinicalAgent
from app.api.schemas.agent_requests import ChatRequest
from app.contracts.agent_response import AgentResponse, ResponseType
from app.memory.workflow import ChatMemoryWorkflow
from app.services.generation import GenerationService
from app.workflows import ChatWorkflow
from tests.workflow.test_agent_service import FakeLLM, contract_payload


class FakePatientRepository:
    def __init__(self, patients: dict[str, dict[str, Any]]) -> None:
        self.patients = patients

    def get_by_id(self, patient_id: str) -> dict[str, Any]:
        if patient_id in self.patients:
            return self.patients[patient_id]
        raise KeyError(f"Patient {patient_id} not found")


def log_fallback_mock(calls_list):
    def log(endpoint, response, patient_id, reason):
        calls_list.append((endpoint, patient_id, reason))
        return response
    return log


@pytest.mark.asyncio
async def test_integration_chat_workflow_state_transitions() -> None:
    # 1. Setup mock patient profiles
    mock_patients = {
        # Patient 1: Normal patient eligible for DOACs
        "P_NORMAL": {
            "patient_id": "P_NORMAL",
            "name": "Normal AF Patient",
            "age": 72,
            "gender": "Nam",
            "weight_kg": 72.0,
            "serum_creatinine": 1.0,
            "is_af_confirmed": True,
            "has_heart_failure": False,
            "has_hypertension": True,  # CHA2DS2-VASc = 2 (age 72 (1) + hypertension (1))
            "has_stroke_history": False,
            "has_vascular_disease": False,
            "has_diabetes": False,
            "has_mechanical_valve": False,
            "current_medications": ["aspirin"],
        },
        # Patient 2: Severe renal failure (CrCl = 9 mL/min) -> DOACs blocked, fallback to Warfarin
        "P_RENAL": {
            "patient_id": "P_RENAL",
            "name": "Renal Failure Patient",
            "age": 72,
            "gender": "Nam",
            "weight_kg": 72.0,
            "serum_creatinine": 8.0,  # High creatinine -> very low CrCl
            "is_af_confirmed": True,
            "has_heart_failure": False,
            "has_hypertension": True,
            "has_stroke_history": False,
            "has_vascular_disease": False,
            "has_diabetes": False,
            "has_mechanical_valve": False,
            "current_medications": [],
        },
        # Patient 3: Mechanical valve -> DOACs blocked, force Warfarin
        "P_VALVE": {
            "patient_id": "P_VALVE",
            "name": "Valve Patient",
            "age": 72,
            "gender": "Nam",
            "weight_kg": 72.0,
            "serum_creatinine": 1.0,
            "is_af_confirmed": True,
            "has_heart_failure": False,
            "has_hypertension": True,
            "has_stroke_history": False,
            "has_vascular_disease": False,
            "has_diabetes": False,
            "has_mechanical_valve": True,
            "current_medications": [],
        },
        # Patient 4: Drug Interaction with Ketoconazole
        "P_DDI": {
            "patient_id": "P_DDI",
            "name": "DDI Patient",
            "age": 72,
            "gender": "Nam",
            "weight_kg": 72.0,
            "serum_creatinine": 1.0,
            "is_af_confirmed": True,
            "has_heart_failure": False,
            "has_hypertension": True,
            "has_stroke_history": False,
            "has_vascular_disease": False,
            "has_diabetes": False,
            "has_mechanical_valve": False,
            "current_medications": ["ketoconazole"],
        }
    }

    repo = FakePatientRepository(mock_patients)
    fallback_calls = []

    from langgraph.checkpoint.memory import MemorySaver

    # Initialize ChatWorkflow
    memory_workflow = ChatMemoryWorkflow(checkpointer=MemorySaver())
    # Ensure memory_workflow uses MemorySaver checkpointer (which is default for tests)
    llm = FakeLLM([
        json.dumps(contract_payload(response_type="chat", source_id="CONV_NORMAL")),
        json.dumps(contract_payload(response_type="chat", source_id="CONV_RENAL")),
        json.dumps(contract_payload(response_type="chat", source_id="CONV_VALVE")),
        json.dumps(contract_payload(response_type="chat", source_id="CONV_DDI")),
    ])
    workflow = ChatWorkflow(
        patient_repository=repo,
        clinical_agent=ClinicalAgent(),
        generation_service=GenerationService(llm),
        memory_workflow=memory_workflow,
        log_fallback=log_fallback_mock(fallback_calls),
    )

    # --- Scenario 1: Test normal patient workflow ---
    res_normal = await workflow.run(
        ChatRequest(
            patient_id="P_NORMAL",
            conversation_id="CONV_NORMAL",
            message="Recommends a drug for my AF.",
        )
    )
    assert res_normal.response_type == ResponseType.CHAT
    
    # Verify LangGraph State
    state_normal = workflow._graph.get_state(config={"configurable": {"thread_id": "CONV_NORMAL"}}).values
    assert state_normal["clinical_features"]["crcl"] > 50
    assert state_normal["clinical_features"]["cha2ds2_vasc"] == 2
    assert "apixaban" in state_normal["allowed_drugs"]
    assert "rivaroxaban" in state_normal["allowed_drugs"]
    assert len(state_normal["blocked_drugs"]) == 0
    assert len(state_normal["retrieved_evidence"]) > 0
    assert len(state_normal["triggered_rules"]) > 0
    assert any("condition" in r for r in state_normal["triggered_rules"])

    # --- Scenario 2: Test severe renal failure fallback ---
    res_renal = await workflow.run(
        ChatRequest(
            patient_id="P_RENAL",
            conversation_id="CONV_RENAL",
            message="What can I prescribe for AF?",
        )
    )
    state_renal = workflow._graph.get_state(config={"configurable": {"thread_id": "CONV_RENAL"}}).values
    assert state_renal["clinical_features"]["crcl"] < 15
    # DOACs must be blocked
    assert "apixaban" in state_renal["blocked_drugs"]
    assert "rivaroxaban" in state_renal["blocked_drugs"]
    # Fallback to Warfarin VKA should occur
    assert state_renal["allowed_drugs"] == ["warfarin"]
    assert len(state_renal["triggered_rules"]) > 0
    assert any(r.get("id") == "SEVERE_RENAL_FAILURE_CONTRAINDICATION" for r in state_renal["triggered_rules"])

    # --- Scenario 3: Test mechanical valve ---
    res_valve = await workflow.run(
        ChatRequest(
            patient_id="P_VALVE",
            conversation_id="CONV_VALVE",
            message="Any drugs contraindicated for AF?",
        )
    )
    state_valve = workflow._graph.get_state(config={"configurable": {"thread_id": "CONV_VALVE"}}).values
    assert state_valve["clinical_features"]["has_mechanical_valve"] is True
    # DOACs must be blocked
    assert "apixaban" in state_valve["blocked_drugs"]
    assert "warfarin" in state_valve["allowed_drugs"]
    assert len(state_valve["triggered_rules"]) > 0
    assert any(r.get("id") == "MECHANICAL_VALVE_CONTRAINDICATION" for r in state_valve["triggered_rules"])

    # --- Scenario 4: Test drug-drug interactions (DDI) ---
    res_ddi = await workflow.run(
        ChatRequest(
            patient_id="P_DDI",
            conversation_id="CONV_DDI",
            message="Is ketoconazole safe with anticoagulants?",
        )
    )
    state_ddi = workflow._graph.get_state(config={"configurable": {"thread_id": "CONV_DDI"}}).values
    # Apixaban and Rivaroxaban must be blocked due to Ketoconazole
    assert "apixaban" in state_ddi["blocked_drugs"]
    assert "rivaroxaban" in state_ddi["blocked_drugs"]
    assert len(state_ddi["triggered_rules"]) > 0
    assert any(r.get("id") == "APIXABAN_KETOCONAZOLE_DDI" for r in state_ddi["triggered_rules"])


from app.services.clinical.retriever import GuidelineRetriever

class MockGuidelineRetriever(GuidelineRetriever):
    async def retrieve(
        self,
        query: str,
        clinical_features: dict[str, Any],
        triggered_rules: list[dict[str, Any]],
    ) -> list[str]:
        return [f"Mocked Evidence for P_TEST: {query}"]

@pytest.mark.asyncio
async def test_guideline_retriever_pluggability() -> None:
    # Setup patient
    mock_patients = {
        "P_TEST": {
            "patient_id": "P_TEST",
            "name": "Test Patient",
            "age": 70,
            "gender": "Nam",
            "weight_kg": 70.0,
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
    }
    repo = FakePatientRepository(mock_patients)
    
    from langgraph.checkpoint.memory import MemorySaver
    
    memory_workflow = ChatMemoryWorkflow(checkpointer=MemorySaver())
    llm = FakeLLM([
        json.dumps(contract_payload(response_type="chat", source_id="CONV_TEST")),
    ])
    
    mock_retriever = MockGuidelineRetriever()
    workflow = ChatWorkflow(
        patient_repository=repo,
        clinical_agent=ClinicalAgent(),
        generation_service=GenerationService(llm),
        memory_workflow=memory_workflow,
        log_fallback=log_fallback_mock([]),
        guideline_retriever=mock_retriever,
    )
    
    res = await workflow.run(
        ChatRequest(
            patient_id="P_TEST",
            conversation_id="CONV_TEST",
            message="Check my eligibility for AF anticoagulation.",
        )
    )
    
    state = workflow._graph.get_state(config={"configurable": {"thread_id": "CONV_TEST"}}).values
    assert state["retrieved_evidence"] == ["Mocked Evidence for P_TEST: Check my eligibility for AF anticoagulation."]
    assert len(state["triggered_rules"]) > 0
