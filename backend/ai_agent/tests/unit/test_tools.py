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


@pytest.mark.asyncio
async def test_vitals_summary_tool_falls_back_to_fixture_when_db_connector_is_none() -> None:
    from app.tools.clinical import VitalsSummaryTool

    tool = VitalsSummaryTool(db_connector=None)
    response = await tool.run(
        ToolRequest(
            name=tool.name,
            arguments={"patient_id": "P001", "time_window_minutes": 30},
        )
    )

    assert response.status == ToolStatus.SUCCESS
    assert response.data["patient_id"] == "P001"
    assert response.data["time_window_minutes"] == 30
    assert response.data["interval_seconds"] == 10
    assert "summary" in response.data
    assert len(response.data["summary"]) > 0


@pytest.mark.asyncio
async def test_vitals_summary_tool_applies_adaptive_downsampling_rules() -> None:
    from app.tools.clinical import VitalsSummaryTool

    tool = VitalsSummaryTool(db_connector=None)

    # 1. Short window (<= 15 minutes) -> 5 seconds downsampling
    r1 = await tool.run(
        ToolRequest(
            name=tool.name,
            arguments={"patient_id": "P001", "time_window_minutes": 10},
        )
    )
    assert r1.data["interval_seconds"] == 5

    # 2. Medium window (> 15 and <= 60 minutes) -> 10 seconds downsampling
    r2 = await tool.run(
        ToolRequest(
            name=tool.name,
            arguments={"patient_id": "P001", "time_window_minutes": 45},
        )
    )
    assert r2.data["interval_seconds"] == 10

    # 3. Long window (> 60 minutes) -> 60 seconds downsampling
    r3 = await tool.run(
        ToolRequest(
            name=tool.name,
            arguments={"patient_id": "P001", "time_window_minutes": 120},
        )
    )
    assert r3.data["interval_seconds"] == 60


@pytest.mark.asyncio
async def test_vitals_summary_tool_returns_error_for_invalid_parameters() -> None:
    from app.tools.clinical import VitalsSummaryTool

    tool = VitalsSummaryTool(db_connector=None)
    response = await tool.run(
        ToolRequest(
            name=tool.name,
            arguments={"patient_id": "P001", "time_window_minutes": "invalid"},
        )
    )

    assert response.status == ToolStatus.ERROR

