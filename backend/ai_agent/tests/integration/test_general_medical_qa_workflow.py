import json
import pytest
from typing import Any

from app.agents.clinical import ClinicalAgent
from app.api.schemas.agent_requests import ChatRequest
from app.contracts.agent_response import AgentResponse, ResponseType
from app.memory.workflow import ChatMemoryWorkflow
from app.services.generation import GenerationService
from app.services.intent import IntentClassifier, ChatIntent
from app.workflows import ChatWorkflow
from app.workflows.chat_workflow import _build_default_tool_registry, _build_default_guideline_retriever
from app.tools.clinical.medical_search_tool import MedicalSearchTool
from app.repositories.ports import RepositoryItemNotFoundError
from tests.workflow.test_agent_service import FakeLLM, contract_payload
from langgraph.checkpoint.memory import MemorySaver


class FakePatientRepository:
    def __init__(self, patients: dict[str, dict[str, Any]] | None = None) -> None:
        self.patients = patients or {}

    def get_by_id(self, patient_id: str) -> dict[str, Any]:
        if patient_id in self.patients:
            return self.patients[patient_id]
        raise RepositoryItemNotFoundError(patient_id)


class MockExaResult:
    def __init__(self, title: str, url: str, highlights: list[str]) -> None:
        self.title = title
        self.url = url
        self.highlights = highlights


class MockExaResponse:
    def __init__(self, results: list[MockExaResult]) -> None:
        self.results = results


class MockExaClient:
    def __init__(self, results: list[MockExaResult]) -> None:
        self.mock_results = results

    def search(self, *args, **kwargs) -> MockExaResponse:
        return MockExaResponse(self.mock_results)


def log_fallback_mock(calls_list):
    def log(endpoint, response, patient_id, reason):
        calls_list.append((endpoint, patient_id, reason))
        return response
    return log


@pytest.mark.asyncio
async def test_general_medical_qa_workflow_success() -> None:
    repo = FakePatientRepository()
    fallback_calls = []

    mock_results = [
        MockExaResult(title="ACC/AHA HF Guidelines", url="https://cdc.gov/guidelines", highlights=["Heart Failure Stage C definition"]),
        MockExaResult(title="Mayo Clinic Heart Failure", url="https://mayoclinic.org/hf", highlights=["Symptomatic heart failure"]),
    ]

    tool_registry = _build_default_tool_registry(
        patient_repository=repo,
        guideline_retriever=_build_default_guideline_retriever(),
        llm_provider=None,
    )
    mock_search_tool = MedicalSearchTool(
        api_key="exa_mock_key_for_testing",
        llm_provider=None,
        exa_client=MockExaClient(mock_results),
    )
    tool_registry._tools["clinical.medical_search_tool"] = mock_search_tool

    payload = contract_payload(response_type="chat", source_id="CONV_QA_1")
    payload["narrative_summary"] = "Theo hướng dẫn [1], suy tim Stage C là có triệu chứng [2]."
    
    llm = FakeLLM([json.dumps(payload)])

    memory_workflow = ChatMemoryWorkflow(checkpointer=MemorySaver())
    workflow = ChatWorkflow(
        patient_repository=repo,
        clinical_agent=ClinicalAgent(),
        generation_service=GenerationService(llm),
        memory_workflow=memory_workflow,
        log_fallback=log_fallback_mock(fallback_calls),
        tool_registry=tool_registry,
        intent_classifier=IntentClassifier(use_llm=False),
    )

    res = await workflow.run(
        ChatRequest(
            patient_id=None,
            conversation_id="CONV_QA_1",
            message="What are the criteria for ACC/AHA Stage C?",
        )
    )

    assert res.response_type == ResponseType.CHAT
    assert "ACC/AHA HF Guidelines" in res.narrative_summary
    assert "https://cdc.gov/guidelines" in res.narrative_summary
    assert "https://mayoclinic.org/hf" in res.narrative_summary
    assert "Tài liệu tham khảo:" in res.narrative_summary
    assert "- [1] [ACC/AHA HF Guidelines](https://cdc.gov/guidelines)" in res.narrative_summary
    assert "- [2] [Mayo Clinic Heart Failure](https://mayoclinic.org/hf)" in res.narrative_summary


@pytest.mark.asyncio
async def test_general_medical_qa_workflow_hallucination_mitigation() -> None:
    repo = FakePatientRepository()
    fallback_calls = []

    mock_results = [
        MockExaResult(title="ACC/AHA HF Guidelines", url="https://cdc.gov/guidelines", highlights=["Heart Failure Stage C definition"]),
    ]

    tool_registry = _build_default_tool_registry(
        patient_repository=repo,
        guideline_retriever=_build_default_guideline_retriever(),
        llm_provider=None,
    )
    mock_search_tool = MedicalSearchTool(
        api_key="exa_mock_key_for_testing",
        llm_provider=None,
        exa_client=MockExaClient(mock_results),
    )
    tool_registry._tools["clinical.medical_search_tool"] = mock_search_tool

    payload = contract_payload(response_type="chat", source_id="CONV_QA_2")
    payload["narrative_summary"] = "Theo nghiên cứu [1] và một bài báo khác [4], HF rất nguy hiểm."
    
    llm = FakeLLM([json.dumps(payload)])

    memory_workflow = ChatMemoryWorkflow(checkpointer=MemorySaver())
    workflow = ChatWorkflow(
        patient_repository=repo,
        clinical_agent=ClinicalAgent(),
        generation_service=GenerationService(llm),
        memory_workflow=memory_workflow,
        log_fallback=log_fallback_mock(fallback_calls),
        tool_registry=tool_registry,
        intent_classifier=IntentClassifier(use_llm=False),
    )

    res = await workflow.run(
        ChatRequest(
            patient_id=None,
            conversation_id="CONV_QA_2",
            message="Cho tôi biết về guideline acc/aha?",
        )
    )

    assert res.response_type == ResponseType.CHAT
    assert "[4]" not in res.narrative_summary
    assert "[1]" in res.narrative_summary
    assert "- [1] [ACC/AHA HF Guidelines](https://cdc.gov/guidelines)" in res.narrative_summary
    assert "Tài liệu tham khảo:" in res.narrative_summary


@pytest.mark.asyncio
async def test_general_medical_qa_workflow_no_results_fallback() -> None:
    repo = FakePatientRepository()
    fallback_calls = []

    mock_results = []

    tool_registry = _build_default_tool_registry(
        patient_repository=repo,
        guideline_retriever=_build_default_guideline_retriever(),
        llm_provider=None,
    )
    mock_search_tool = MedicalSearchTool(
        api_key="exa_mock_key_for_testing",
        llm_provider=None,
        exa_client=MockExaClient(mock_results),
    )
    tool_registry._tools["clinical.medical_search_tool"] = mock_search_tool

    payload = contract_payload(response_type="chat", source_id="CONV_QA_3")
    payload["narrative_summary"] = "Tôi nghĩ là suy tim Stage C rất khó thở."
    
    llm = FakeLLM([json.dumps(payload)])

    memory_workflow = ChatMemoryWorkflow(checkpointer=MemorySaver())
    workflow = ChatWorkflow(
        patient_repository=repo,
        clinical_agent=ClinicalAgent(),
        generation_service=GenerationService(llm),
        memory_workflow=memory_workflow,
        log_fallback=log_fallback_mock(fallback_calls),
        tool_registry=tool_registry,
        intent_classifier=IntentClassifier(use_llm=False),
    )

    res = await workflow.run(
        ChatRequest(
            patient_id=None,
            conversation_id="CONV_QA_3",
            message="Cho tôi biết về tiêu chuẩn esc?",
        )
    )

    assert res.response_type == ResponseType.CHAT
    assert res.narrative_summary == "Tôi không tìm thấy bằng chứng y văn chính thống cho câu hỏi này từ các nguồn được cấu hình."
