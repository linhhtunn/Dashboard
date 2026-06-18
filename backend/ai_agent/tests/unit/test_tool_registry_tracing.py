import pytest

from app.contracts import ToolStatus, tool_success
from app.core.config import Settings
from app.observability import RecordingTracer, configure_tracer_for_testing, reset_tracer_for_testing
from app.tools import ToolContext, ToolRegistry, ToolRequest


class EchoTool:
    name = "clinical.echo"
    description = "echo tool"

    async def run(self, request, context=None):
        return tool_success(
            tool_name=self.name,
            data={
                "patients": [{"patient_id": "P001"}],
                "actions": [{"type": "select_patient_for_chat"}],
                "data_availability": {"patient_directory": True},
            },
            message="ok",
        )


@pytest.fixture
def tracer():
    recording = RecordingTracer(Settings(LANGFUSE_CAPTURE_CONTENT=False))
    configure_tracer_for_testing(recording)
    try:
        yield recording
    finally:
        reset_tracer_for_testing()


@pytest.mark.asyncio
async def test_tool_registry_records_successful_tool_span(tracer) -> None:
    registry = ToolRegistry()
    registry.register(EchoTool())

    response = await registry.run(
        ToolRequest(name="clinical.echo", arguments={"patient_id": "P001", "query": "raw name"}),
        ToolContext(patient_id="P001", conversation_id="CONV", metadata={"intent": "patient_lookup"}),
    )

    assert response.status == ToolStatus.SUCCESS
    record = next(record for record in tracer.records if record["name"] == "tool.clinical.echo")
    assert record["as_type"] == "tool"
    assert record["metadata"]["status"] == "success"
    assert record["metadata"]["candidate_count"] == 1
    assert record["metadata"]["action_count"] == 1
    assert isinstance(record["metadata"]["latency_ms"], float)
    assert record["metadata"]["patient_id"] != "P001"


@pytest.mark.asyncio
async def test_tool_registry_records_missing_tool_span(tracer) -> None:
    registry = ToolRegistry()

    response = await registry.run(ToolRequest(name="clinical.missing"))

    assert response.status == ToolStatus.NOT_FOUND
    record = next(record for record in tracer.records if record["name"] == "tool.clinical.missing")
    assert record["as_type"] == "tool"
    assert record["metadata"]["status"] == "not-found"
    assert isinstance(record["metadata"]["latency_ms"], float)


@pytest.mark.asyncio
async def test_tool_registry_records_raw_input_output_when_content_capture_is_enabled() -> None:
    recording = RecordingTracer(Settings(LANGFUSE_CAPTURE_CONTENT=True, LANGFUSE_PATIENT_ID_MODE="raw"))
    configure_tracer_for_testing(recording)
    try:
        registry = ToolRegistry()
        registry.register(EchoTool())

        await registry.run(
            ToolRequest(name="clinical.echo", arguments={"patient_id": "P001", "query": "raw name"}),
            ToolContext(patient_id="P001", conversation_id="CONV", metadata={"intent": "patient_lookup"}),
        )
    finally:
        reset_tracer_for_testing()

    record = next(record for record in recording.records if record["name"] == "tool.clinical.echo")
    assert record["input"]["arguments"]["query"] == "raw name"
    assert record["input"]["context"]["patient_id"] == "P001"
    assert record["output"]["status"] == "success"
    assert record["output"]["data"]["patients"] == [{"patient_id": "P001"}]
