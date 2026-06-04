import pytest

from app.contracts import ToolStatus
from app.repositories.fixtures import FixturePatientRepository
from app.tools import ToolContext, ToolRegistry, ToolRequest
from app.tools.clinical import PatientContextTool
from app.tools.registry import ToolRegistrationError


@pytest.mark.asyncio
async def test_patient_context_tool_fetches_patient_through_repository() -> None:
    tool = PatientContextTool(patient_repository=FixturePatientRepository())

    response = await tool.run(
        ToolRequest(
            name=tool.name,
            arguments={"patient_id": "P001"},
        )
    )

    assert response.ok
    assert response.data["patient"]["patient_id"] == "P001"


@pytest.mark.asyncio
async def test_patient_context_tool_can_use_context_patient_id() -> None:
    tool = PatientContextTool(patient_repository=FixturePatientRepository())

    response = await tool.run(
        ToolRequest(name=tool.name),
        ToolContext(patient_id="P001"),
    )

    assert response.status == ToolStatus.SUCCESS
    assert response.data["patient"]["patient_id"] == "P001"


@pytest.mark.asyncio
async def test_patient_context_tool_returns_not_found_for_unknown_patient() -> None:
    tool = PatientContextTool(patient_repository=FixturePatientRepository())

    response = await tool.run(
        ToolRequest(
            name=tool.name,
            arguments={"patient_id": "UNKNOWN"},
        )
    )

    assert response.status == ToolStatus.NOT_FOUND
    assert response.data == {}


@pytest.mark.asyncio
async def test_tool_registry_runs_registered_tool() -> None:
    tool = PatientContextTool(patient_repository=FixturePatientRepository())
    registry = ToolRegistry()
    registry.register(tool)

    response = await registry.run(
        ToolRequest(
            name=tool.name,
            arguments={"patient_id": "P001"},
        )
    )

    assert registry.names() == [tool.name]
    assert response.ok


@pytest.mark.asyncio
async def test_tool_registry_returns_not_found_for_missing_tool() -> None:
    registry = ToolRegistry()

    response = await registry.run(ToolRequest(name="missing.tool"))

    assert response.status == ToolStatus.NOT_FOUND
    assert response.tool_name == "missing.tool"


def test_tool_registry_rejects_duplicate_tool_names() -> None:
    registry = ToolRegistry()
    tool = PatientContextTool(patient_repository=FixturePatientRepository())
    registry.register(tool)

    with pytest.raises(ToolRegistrationError):
        registry.register(tool)
