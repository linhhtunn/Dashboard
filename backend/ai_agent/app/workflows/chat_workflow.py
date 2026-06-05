import logging
from collections.abc import Callable
from dataclasses import dataclass

from app.agents.clinical import ClinicalAgent
from app.api.schemas.agent_requests import ChatRequest
from app.contracts.agent_response import AgentResponse, ResponseType
from app.memory.workflow import ChatGenerationResult, ChatMemoryWorkflow
from app.repositories.ports import PatientRepository, RepositoryItemNotFoundError
from app.services.fallback import build_chat_fallback
from app.services.generation import GenerationService
from app.services.safety import PromptSafetyDecision, classify_prompt_injection

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ChatWorkflow:
    patient_repository: PatientRepository
    clinical_agent: ClinicalAgent
    generation_service: GenerationService
    memory_workflow: ChatMemoryWorkflow
    log_fallback: Callable[..., AgentResponse]

    async def run(self, request: ChatRequest) -> AgentResponse:
        safety = classify_prompt_injection(request.message)
        logger.info(
            "safety_gateway_decision endpoint=chat decision=%s matched_rules=%s",
            safety.decision.value,
            ",".join(safety.matched_rules) if safety.matched_rules else "none",
        )
        if safety.decision == PromptSafetyDecision.BLOCK:
            return self.log_fallback(
                endpoint="chat",
                response=build_chat_fallback(
                    patient_id=request.patient_id,
                    conversation_id=request.conversation_id,
                    reason=safety.reason,
                ),
                patient_id=request.patient_id,
                reason=safety.reason,
            )

        try:
            patient = self.patient_repository.get_by_id(request.patient_id)
        except RepositoryItemNotFoundError:
            return self.log_fallback(
                endpoint="chat",
                response=build_chat_fallback(
                    patient_id=request.patient_id,
                    conversation_id=request.conversation_id,
                    reason="Khong tim thay mock patient fixture cho patient_id nay.",
                ),
                patient_id=request.patient_id,
                reason="Khong tim thay mock patient fixture cho patient_id nay.",
            )

        source_id = request.conversation_id or request.patient_id

        async def generate_from_memory(memory_context: str) -> ChatGenerationResult:
            prompt = self.clinical_agent.build_chat_prompt(
                patient=patient,
                message=request.message,
                conversation_id=request.conversation_id,
                memory_context=memory_context,
            )
            result = await self.generation_service.generate_with_contract(
                user_prompt=prompt,
                expected_response_type=ResponseType.CHAT,
                expected_patient_id=request.patient_id,
                expected_source_id=source_id,
                fallback=lambda reason: build_chat_fallback(
                    patient_id=request.patient_id,
                    conversation_id=request.conversation_id,
                    reason=reason,
                ),
                log_fallback=self.log_fallback,
            )
            return ChatGenerationResult(
                response=result.response,
                safe_for_memory=result.safe_for_memory,
            )

        return await self.memory_workflow.run(
            patient_id=request.patient_id,
            conversation_id=source_id,
            message=request.message,
            generate_response=generate_from_memory,
        )
