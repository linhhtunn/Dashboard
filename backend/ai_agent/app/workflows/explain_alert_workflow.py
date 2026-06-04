from collections.abc import Callable
from dataclasses import dataclass

from app.agents.clinical import ClinicalAgent
from app.api.schemas.agent_requests import ExplainAlertRequest
from app.contracts.agent_response import AgentResponse, ResponseType
from app.repositories.ports import AlertRepository, PatientRepository, RepositoryItemNotFoundError
from app.services.fallback import build_explain_alert_fallback
from app.services.generation import GenerationService


@dataclass(frozen=True)
class ExplainAlertWorkflow:
    alert_repository: AlertRepository
    patient_repository: PatientRepository
    clinical_agent: ClinicalAgent
    generation_service: GenerationService
    log_fallback: Callable[..., AgentResponse]

    async def run(self, request: ExplainAlertRequest) -> AgentResponse:
        try:
            alert = self.alert_repository.get_by_id(request.alert_id)
            patient = self.patient_repository.get_by_id(alert["patient_id"])
        except RepositoryItemNotFoundError:
            return self.log_fallback(
                endpoint="explain-alert",
                response=build_explain_alert_fallback(
                    patient_id="UNKNOWN",
                    alert_id=request.alert_id,
                    reason="Khong tim thay mock alert fixture cho alert_id nay.",
                ),
                patient_id="UNKNOWN",
                reason="Khong tim thay mock alert fixture cho alert_id nay.",
            )

        prompt = self.clinical_agent.build_explain_alert_prompt(alert, patient)
        result = await self.generation_service.generate_with_contract(
            user_prompt=prompt,
            expected_response_type=ResponseType.EXPLAIN_ALERT,
            expected_patient_id=patient["patient_id"],
            expected_source_id=request.alert_id,
            fallback=lambda reason: build_explain_alert_fallback(
                patient_id=patient["patient_id"],
                alert_id=request.alert_id,
                reason=reason,
            ),
            log_fallback=self.log_fallback,
        )
        return result.response
