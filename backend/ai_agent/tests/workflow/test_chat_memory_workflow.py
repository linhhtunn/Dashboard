import json

import psycopg
import pytest

from app.memory.workflow import ChatMemoryWorkflow
from app.api.schemas.agent_requests import ChatRequest
from app.services.agent_service import AgentService
from tests.workflow.test_agent_service import FakeLLM, contract_payload, make_agent_service


@pytest.fixture(autouse=True)
def disable_intent_llm(monkeypatch):
    from app.core.config import get_settings
    monkeypatch.setenv("INTENT_CLASSIFIER_USE_LLM", "false")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()



class CapturingFakeLLM(FakeLLM):
    def __init__(self, outputs: list[str]) -> None:
        super().__init__(outputs)
        self.user_prompts: list[str] = []

    async def generate_text(self, *, system_prompt: str, user_prompt: str, temperature: float = 0.2):
        self.user_prompts.append(user_prompt)
        return await super().generate_text(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
        )


class FailingGraph:
    async def ainvoke(self, input_state, config):
        raise psycopg.OperationalError("the connection is closed")


@pytest.mark.asyncio
async def test_repeated_conversation_id_resumes_short_term_memory() -> None:
    llm = CapturingFakeLLM(
        [
            json.dumps(contract_payload(response_type="chat", source_id="CONV_P001_001")),
            json.dumps(contract_payload(response_type="chat", source_id="CONV_P001_001")),
        ]
    )
    service = make_agent_service(llm_client=llm, memory_workflow=ChatMemoryWorkflow())

    await service.chat(
        ChatRequest(
            patient_id="P001",
            conversation_id="CONV_P001_001",
            message="Hay nho rang toi dang hoi ve nhip tim.",
        )
    )
    await service.chat(
        ChatRequest(
            patient_id="P001",
            conversation_id="CONV_P001_001",
            message="Cau hoi truoc cua toi la gi?",
        )
    )

    assert "Hay nho rang toi dang hoi ve nhip tim." in llm.user_prompts[-1]
    assert "Recent raw turns:" in llm.user_prompts[-1]


@pytest.mark.asyncio
async def test_invalid_chat_response_does_not_pollute_memory() -> None:
    llm = CapturingFakeLLM(
        [
            "not json",
            json.dumps(contract_payload(response_type="chat", source_id="CONV_P001_001")),
        ]
    )
    workflow = ChatMemoryWorkflow()
    service = make_agent_service(llm_client=llm, memory_workflow=workflow)

    await service.chat(
        ChatRequest(
            patient_id="P001",
            conversation_id="CONV_P001_001",
            message="Tin loi nay khong nen vao memory.",
        )
    )
    await service.chat(
        ChatRequest(
            patient_id="P001",
            conversation_id="CONV_P001_001",
            message="Memory dang co gi?",
        )
    )

    assert "Tin loi nay khong nen vao memory." not in llm.user_prompts[-1]
    assert workflow._store["CONV_P001_001"]["turn_count"] == 2


@pytest.mark.asyncio
async def test_graph_memory_backend_failure_falls_back_to_manual_memory() -> None:
    llm = CapturingFakeLLM(
        [json.dumps(contract_payload(response_type="chat", source_id="CONV_P001_001"))]
    )
    workflow = ChatMemoryWorkflow()
    workflow._graph = FailingGraph()
    service = make_agent_service(llm_client=llm, memory_workflow=workflow)

    response = await service.chat(
        ChatRequest(
            patient_id="P001",
            conversation_id="CONV_P001_001",
            message="Memory backend dang loi thi van tra loi duoc khong?",
        )
    )

    assert response.source_id == "CONV_P001_001"
    assert workflow._store["CONV_P001_001"]["turn_count"] == 2
