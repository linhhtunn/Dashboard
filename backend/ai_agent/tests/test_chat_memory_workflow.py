import json

import pytest

from app.memory.workflow import ChatMemoryWorkflow
from app.schemas import ChatRequest, ExplainAlertRequest, SummaryRequest
from app.services.agent_service import AgentService
from tests.test_agent_service import FakeLLM, contract_payload


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


@pytest.mark.asyncio
async def test_repeated_conversation_id_resumes_short_term_memory() -> None:
    llm = CapturingFakeLLM(
        [
            json.dumps(contract_payload(response_type="chat", source_id="CONV_P001_001")),
            json.dumps(contract_payload(response_type="chat", source_id="CONV_P001_001")),
        ]
    )
    service = AgentService(llm_client=llm, memory_workflow=ChatMemoryWorkflow())

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
            "still not json",
            json.dumps(contract_payload(response_type="chat", source_id="CONV_P001_001")),
        ]
    )
    workflow = ChatMemoryWorkflow()
    service = AgentService(llm_client=llm, memory_workflow=workflow)

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
async def test_summary_and_explain_alert_do_not_touch_chat_memory() -> None:
    workflow = ChatMemoryWorkflow()
    service = AgentService(
        llm_client=FakeLLM(
            [
                json.dumps(contract_payload(response_type="summary", source_id="P001")),
                json.dumps(
                    contract_payload(
                        response_type="explain-alert",
                        patient_id="P001",
                        source_id="ALT_FALL_0092",
                    )
                ),
            ]
        ),
        memory_workflow=workflow,
    )

    await service.summarize_patient(SummaryRequest(patient_id="P001"))
    await service.explain_alert(ExplainAlertRequest(alert_id="ALT_FALL_0092"))

    assert workflow._store == {}
