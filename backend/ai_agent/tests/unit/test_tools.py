import pytest

from app.contracts import ToolStatus
from app.repositories.fixtures import FixturePatientRepository
from app.repositories.ports import RepositoryItemNotFoundError
from app.tools import ToolContext, ToolRegistry, ToolRequest
from app.tools.clinical import (
    AFAnticoagulationRecommendationContextTool,
    AlertExplanationContextTool,
    DoctorPatientOverviewContextTool,
    MedicationRecommendationContextTool,
    PatientContextTool,
    PatientSearchContextTool,
    PatientSummaryContextTool,
    VitalsSummaryTool,
    VitalsTrendContextTool,
)
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


@pytest.mark.asyncio
async def test_patient_search_tool_finds_exact_hospital_patient_code() -> None:
    tool = PatientSearchContextTool(patient_repository=FixturePatientRepository())

    response = await tool.run(ToolRequest(name=tool.name, arguments={"query": "P001"}))

    assert response.ok
    assert response.data["match_status"] == "single"
    assert response.data["patients"][0]["patient_id"] == "P001"
    assert response.data["actions"][0]["type"] == "select_patient_for_chat"


@pytest.mark.asyncio
async def test_patient_search_tool_returns_duplicate_name_candidates() -> None:
    tool = PatientSearchContextTool(patient_repository=FixturePatientRepository())

    response = await tool.run(ToolRequest(name=tool.name, arguments={"query": "Nguyen Van A"}))

    assert response.ok
    assert response.data["match_status"] == "multiple"
    assert {patient["patient_id"] for patient in response.data["patients"]} == {"P001", "P003"}
    assert len(response.data["actions"]) == 2


@pytest.mark.asyncio
async def test_doctor_patient_overview_reports_missing_alert_vitals_connector() -> None:
    tool = DoctorPatientOverviewContextTool(patient_repository=FixturePatientRepository(), db_connector=None)

    response = await tool.run(ToolRequest(name=tool.name, arguments={"limit": 2}))

    assert response.ok
    assert len(response.data["patients"]) == 2
    assert response.data["actions"]
    assert response.data["data_availability"]["health_alerts"] is False
    assert "No database connector" in response.data["data_availability"]["notes"][0]


class FakePatientRepository:
    def __init__(self, patients):
        self.patients = patients

    def get_by_id(self, patient_id: str):
        try:
            return self.patients[patient_id]
        except KeyError as exc:
            raise RepositoryItemNotFoundError(patient_id) from exc


class MissingAlertRepository:
    def get_by_id(self, alert_id: str):
        raise RepositoryItemNotFoundError(alert_id)


class FakeGuidelineRetriever:
    async def retrieve(self, query, clinical_features, triggered_rules):
        return ["Mock guideline evidence"]


class FailingVitalsTool:
    name = "clinical.get_patient_vitals_summary"
    description = "fake failing vitals tool"

    async def run(self, request, context=None):
        from app.contracts import tool_error

        return tool_error(
            tool_name=self.name,
            message="relation clean_vitals does not exist",
        )


def patient_only_profile():
    return {
        "patient_id": "P_AF",
        "name": "Patient Only",
        "age": 72,
        "gender": "Nam",
        "medical_history": "Rung nhĩ (AF), Tăng huyết áp",
        "recent_vitals": [],
        "recent_alerts": [],
        "weight_kg": 72.0,
        "serum_creatinine": 1.0,
        "is_af_confirmed": True,
        "has_heart_failure": False,
        "has_hypertension": True,
        "has_stroke_history": False,
        "has_vascular_disease": False,
        "has_diabetes": False,
        "has_mechanical_valve": False,
        "current_medications": [],
    }


def hypertension_patient_profile():
    return {
        "patient_id": "P_HTN",
        "name": "Hypertension Patient",
        "age": 68,
        "gender": "Nu",
        "medical_history": "Tăng huyết áp, đái tháo đường",
        "recent_vitals": [
            {
                "timestamp": "2026-05-28T10:00:00Z",
                "systolic_bp": 158,
                "diastolic_bp": 96,
                "heart_rate": 84,
                "spo2": 97,
                "status": "WARNING",
            }
        ],
        "recent_alerts": [],
        "weight_kg": 64.0,
        "serum_creatinine": 1.1,
        "has_hypertension": True,
        "has_diabetes": True,
        "has_heart_failure": False,
        "has_gout": False,
        "has_hyperkalemia": False,
        "is_pregnant": False,
        "current_medications": [],
    }


@pytest.mark.asyncio
async def test_patient_summary_context_tool_reports_missing_handoff_data() -> None:
    tool = PatientSummaryContextTool(
        patient_repository=FakePatientRepository({"P_AF": patient_only_profile()})
    )

    response = await tool.run(ToolRequest(name=tool.name, arguments={"patient_id": "P_AF"}))

    assert response.ok
    assert response.data["patient"]["patient_id"] == "P_AF"
    assert response.data["data_availability"]["recent_alerts"] is False
    assert response.data["data_availability"]["recent_vitals"] is False


@pytest.mark.asyncio
async def test_alert_explanation_context_tool_returns_missing_data_payload() -> None:
    tool = AlertExplanationContextTool(
        alert_repository=MissingAlertRepository(),
        patient_repository=FakePatientRepository({"P_AF": patient_only_profile()}),
    )

    response = await tool.run(ToolRequest(name=tool.name, arguments={"alert_id": "ALT_MISSING"}))

    assert response.ok
    assert response.data["alert"] is None
    assert response.data["data_availability"]["alert"] is False


@pytest.mark.asyncio
async def test_af_anticoagulation_context_tool_returns_medication_context() -> None:
    from app.services.clinical.rule_engine import RuleEngine

    rule_engine = RuleEngine("rules/af")
    tool = AFAnticoagulationRecommendationContextTool(
        patient_repository=FakePatientRepository({"P_AF": patient_only_profile()}),
        rule_engine=rule_engine,
        guideline_retriever=FakeGuidelineRetriever(),
    )

    response = await tool.run(
        ToolRequest(
            name=tool.name,
            arguments={"patient_id": "P_AF", "query": "Can we use a DOAC?"},
        )
    )

    assert response.ok
    assert "apixaban" in response.data["allowed_drugs"]


@pytest.mark.asyncio
async def test_generic_medication_recommendation_context_tool() -> None:
    from app.services.clinical import MedicationDomainRegistry

    domain_registry = MedicationDomainRegistry("rules")
    domain_registry.discover_domains()

    tool = MedicationRecommendationContextTool(
        patient_repository=FakePatientRepository({
            "P_AF": patient_only_profile(),
            "P_HTN": hypertension_patient_profile(),
        }),
        domain_registry=domain_registry,
    )

    # 1. Test AF Anticoagulation domain resolution and safety checks
    response_af = await tool.run(
        ToolRequest(
            name=tool.name,
            arguments={"patient_id": "P_AF", "query": "Can we use a DOAC? rung nhĩ"},
        )
    )
    assert response_af.ok
    assert "apixaban" in response_af.data["allowed_drugs"]
    assert response_af.data["medication_domain"] == "af_anticoagulation"

    # 2. Test Hypertension domain resolution and safety checks
    response_htn = await tool.run(
        ToolRequest(
            name=tool.name,
            arguments={"patient_id": "P_HTN", "query": "Thuốc tăng huyết áp nên dùng gì?"},
        )
    )
    assert response_htn.ok
    assert response_htn.data["medication_domain"] == "hypertension"
    assert response_htn.data["clinical_features"]["hypertension_stage"] == "stage_2"
    assert "ace_inhibitor" in response_htn.data["allowed_drugs"]
    assert "arb" in response_htn.data["allowed_drugs"]
    assert "warfarin" not in response_htn.data["allowed_drugs"]


@pytest.mark.asyncio
async def test_vitals_trend_context_tool_returns_missing_data_payload() -> None:
    tool = VitalsTrendContextTool(vitals_summary_tool=FailingVitalsTool())

    response = await tool.run(
        ToolRequest(name=tool.name, arguments={"patient_id": "P_AF", "time_window_minutes": 60})
    )

    assert response.ok
    assert response.data["data_availability"]["vitals"] is False
    assert "clean_vitals" in response.data["data_availability"]["notes"][0]
