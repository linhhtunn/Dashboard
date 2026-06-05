from collections.abc import Callable
from dataclasses import dataclass

from app.agents.clinical import ClinicalAgent
from app.api.schemas.agent_requests import SummaryRequest
from app.contracts.agent_response import AgentResponse, ChatIntent, ResponseType
from app.repositories.ports import PatientRepository, RepositoryItemNotFoundError
from app.services.fallback import build_summary_fallback
from app.services.generation import GenerationService


@dataclass(frozen=True)
class SummaryWorkflow:
    patient_repository: PatientRepository
    clinical_agent: ClinicalAgent
    generation_service: GenerationService
    log_fallback: Callable[..., AgentResponse]

    async def run(self, request: SummaryRequest) -> AgentResponse:
        try:
            patient = self.patient_repository.get_by_id(request.patient_id)
        except RepositoryItemNotFoundError:
            return self.log_fallback(
                endpoint="summary",
                response=build_summary_fallback(
                    patient_id=request.patient_id,
                    reason="Khong tim thay mock patient fixture cho patient_id nay.",
                ),
                patient_id=request.patient_id,
                reason="Khong tim thay mock patient fixture cho patient_id nay.",
            )

        prompt = self.clinical_agent.build_summary_prompt(patient)
        result = await self.generation_service.generate_with_contract(
            user_prompt=prompt,
            expected_response_type=ResponseType.SUMMARY,
            expected_intent=ChatIntent.PATIENT_SUMMARY,
            expected_patient_id=request.patient_id,
            expected_source_id=request.patient_id,
            fallback=lambda reason: build_summary_fallback(
                patient_id=request.patient_id,
                reason=reason,
            ),
            log_fallback=self.log_fallback,
        )
        return result.response
