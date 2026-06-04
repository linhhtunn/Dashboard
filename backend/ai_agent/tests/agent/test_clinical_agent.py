from app.agents.clinical import ClinicalAgent
from app.fixtures.clinical import get_patient_fixture


def test_clinical_agent_builds_summary_prompt() -> None:
    prompt = ClinicalAgent().build_summary_prompt(get_patient_fixture("P001"))

    assert "Patient ID: P001" in prompt
    assert "Contract 6 v1" in prompt
