import json
import pytest
from datetime import datetime, timezone

from app.core.config import Settings
from app.memory.store import create_store
from app.memory.long_term.state import PatientClinicalMemory, DoctorPreferenceMemory, WatchlistItem
from app.memory.long_term.extractor import LTMExtractor
from app.memory.workflow import ChatMemoryWorkflow, ChatGenerationResult
from app.agents.clinical import ClinicalAgent
from tests.workflow.test_agent_service import FakeLLM, contract_payload
from app.contracts.agent_response import AgentResponse


def test_store_factory_in_memory() -> None:
    settings = Settings(MEMORY_STORE="in_memory")
    handle = create_store(settings)
    assert handle.store.__class__.__name__ == "InMemoryStore"
    handle.close()


@pytest.mark.asyncio
async def test_ltm_extractor_patient_watchlist() -> None:
    # 1. Mock LLM to return an ADD update
    add_payload = {
        "watchlist_updates": [
            {
                "fact": "Patient has frequent high heart rates during afternoon.",
                "action": "ADD",
                "status": "ACTIVE",
            }
        ]
    }
    fake_llm = FakeLLM([json.dumps(add_payload)])
    extractor = LTMExtractor(fake_llm)

    empty_memory = PatientClinicalMemory(patient_id="P1", clinical_watchlist=[])
    updated = await extractor.extract_patient_memory(
        patient_id="P1",
        current_memory=empty_memory,
        conversation_history="Doctor: patient has spikes. Assistant: noted.",
    )

    assert len(updated.clinical_watchlist) == 1
    assert updated.clinical_watchlist[0].fact == "Patient has frequent high heart rates during afternoon."
    assert updated.clinical_watchlist[0].status == "ACTIVE"

    # 2. Mock LLM to return a RESOLVE update
    resolve_payload = {
        "watchlist_updates": [
            {
                "fact": "Patient has frequent high heart rates during afternoon.",
                "action": "RESOLVE",
                "status": "RESOLVED",
            }
        ]
    }
    fake_llm_resolve = FakeLLM([json.dumps(resolve_payload)])
    extractor_resolve = LTMExtractor(fake_llm_resolve)

    updated_resolved = await extractor_resolve.extract_patient_memory(
        patient_id="P1",
        current_memory=updated,
        conversation_history="Doctor: heart rate is normal now.",
    )

    assert len(updated_resolved.clinical_watchlist) == 1
    assert updated_resolved.clinical_watchlist[0].status == "RESOLVED"


@pytest.mark.asyncio
async def test_ltm_extractor_doctor_preferences() -> None:
    pref_payload = {
        "documentation_style": "SOAP",
        "clinical_rules_updates": [{"rule": "Always list vitals first", "action": "ADD"}],
    }
    fake_llm = FakeLLM([json.dumps(pref_payload)])
    extractor = LTMExtractor(fake_llm)

    empty_memory = DoctorPreferenceMemory(doctor_id="D1")
    updated = await extractor.extract_doctor_memory(
        doctor_id="D1",
        current_memory=empty_memory,
        conversation_history="Doctor: write SOAP notes. always list vitals first.",
    )

    assert updated.documentation_style == "SOAP"
    assert "Always list vitals first" in updated.clinical_rules


@pytest.mark.asyncio
async def test_workflow_ltm_integration_in_memory() -> None:
    settings = Settings(MEMORY_STORE="in_memory")
    store_handle = create_store(settings)
    store = store_handle.store

    # Pre-populate some facts in store
    patient_namespace = ("patient_memory", "P1")
    initial_watchlist = {
        "patient_id": "P1",
        "clinical_watchlist": [
            {
                "fact": "History of mild hypertension",
                "status": "ACTIVE",
                "created_at": "2026-05-28T00:00:00Z",
                "updated_at": "2026-05-28T00:00:00Z",
            }
        ],
    }
    await store.aput(patient_namespace, "clinical_watchlist", initial_watchlist)

    from unittest.mock import AsyncMock, MagicMock
    from app.workflows import ChatWorkflow
    from app.api.schemas.agent_requests import ChatRequest
    from app.repositories.ports import PatientRepository
    from app.services.generation import GenerationService
    from app.memory.short_term.policy import SlidingWindowPolicy

    # 1. Setup ChatMemoryWorkflow with store
    # Mock LLM provider for the extractor reflecting a new watchlist item
    extracted_watchlist = {
        "watchlist_updates": [
            {"fact": "History of mild hypertension", "action": "UPDATE", "status": "ACTIVE"},
            {"fact": "Suspected daytime sleep apnea", "action": "ADD", "status": "ACTIVE"},
        ]
    }
    fake_llm = FakeLLM([json.dumps(extracted_watchlist)])

    workflow = ChatMemoryWorkflow(
        policy=SlidingWindowPolicy(),
        checkpointer=None,  # Use manual/fallback mode to test simulation path
        store=store,
        llm_provider=fake_llm,
    )

    # Mock the main chatbot response generator
    chat_response = contract_payload(response_type="chat", patient_id="P1", source_id="CONV1")
    chat_response_obj = ChatGenerationResult(
        response=AgentResponse.model_validate(chat_response), safe_for_memory=True
    )

    # Setup Mocks for ChatWorkflow dependencies
    mock_patient_repo = MagicMock(spec=PatientRepository)
    mock_patient = MagicMock()
    mock_patient.patient_id = "P1"
    mock_patient_repo.get_by_id.return_value = mock_patient

    mock_generation_service = MagicMock(spec=GenerationService)
    mock_generation_service.generate_with_contract = AsyncMock(return_value=chat_response_obj)

    received_contexts = []
    def fake_build_prompt(patient, message, conversation_id, memory_context, long_term_watchlist, doctor_preferences, *args, **kwargs):
        received_contexts.append((memory_context, long_term_watchlist, doctor_preferences))
        return "Fake Prompt"

    mock_clinical_agent = MagicMock()
    mock_clinical_agent.build_chat_prompt = fake_build_prompt

    chat_wf = ChatWorkflow(
        patient_repository=mock_patient_repo,
        clinical_agent=mock_clinical_agent,
        generation_service=mock_generation_service,
        memory_workflow=workflow,
        log_fallback=lambda **kwargs: None,
    )

    # Run the workflow
    res = await chat_wf.run(
        ChatRequest(
            patient_id="P1",
            conversation_id="CONV1",
            message="Patient reports snoring.",
            doctor_id="D1",
        )
    )

    # Verify that the generated response is returned
    assert res.patient_id == "P1"

    # Verify context passed to chatbot generator contained LTM initial state
    assert len(received_contexts) == 1
    mem_ctx, watchlist_ctx, prefs_ctx = received_contexts[0]
    assert "History of mild hypertension" in watchlist_ctx

    # Verify that LTM extractor was run and updated store
    stored_watchlist_item = await store.aget(patient_namespace, "clinical_watchlist")
    assert stored_watchlist_item is not None
    assert len(stored_watchlist_item.value["clinical_watchlist"]) == 2
    facts = [x["fact"] for x in stored_watchlist_item.value["clinical_watchlist"]]
    assert "Suspected daytime sleep apnea" in facts

    store_handle.close()

