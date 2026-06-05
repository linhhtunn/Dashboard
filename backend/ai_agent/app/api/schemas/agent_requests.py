from pydantic import Field, field_validator

from app.contracts.agent_response import ContractModel


class ChatRequest(ContractModel):
    schema_version: str = "v1"
    patient_id: str = Field(min_length=1)
    conversation_id: str | None = Field(default=None, min_length=1)
    message: str = Field(min_length=1)

    @field_validator("schema_version")
    @classmethod
    def validate_schema_version(cls, schema_version: str) -> str:
        if schema_version != "v1":
            raise ValueError("schema_version must be v1")
        return schema_version


class SummaryRequest(ContractModel):
    patient_id: str = Field(min_length=1)


class ExplainAlertRequest(ContractModel):
    alert_id: str = Field(min_length=1)
