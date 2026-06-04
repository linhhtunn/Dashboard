from __future__ import annotations

from dataclasses import dataclass

from app.contracts import ToolResponse, tool_not_found, tool_success
from app.repositories.ports import PatientRepository, RepositoryItemNotFoundError
from app.tools.base import ToolContext, ToolRequest


@dataclass(frozen=True)
class PatientContextTool:
    patient_repository: PatientRepository

    name: str = "clinical.patient_context"
    description: str = "Fetch normalized patient context for clinical agent workflows."

    async def run(
        self,
        request: ToolRequest,
        context: ToolContext | None = None,
    ) -> ToolResponse:
        patient_id = _resolve_patient_id(request=request, context=context)
        if not patient_id:
            return tool_not_found(
                tool_name=self.name,
                message="patient_id is required",
            )

        try:
            patient = self.patient_repository.get_by_id(patient_id)
        except RepositoryItemNotFoundError:
            return tool_not_found(
                tool_name=self.name,
                message=f"Patient not found: {patient_id}",
            )

        return tool_success(
            tool_name=self.name,
            data={"patient": patient},
        )


def _resolve_patient_id(
    *,
    request: ToolRequest,
    context: ToolContext | None,
) -> str | None:
    patient_id = request.arguments.get("patient_id")
    if isinstance(patient_id, str) and patient_id:
        return patient_id
    if context is None:
        return None
    return context.patient_id
