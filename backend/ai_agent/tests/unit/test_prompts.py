from app.agents.clinical import prompts


def test_prompt_module_exposes_clinical_assistant_templates() -> None:
    assert "AI Clinical Assistant" in prompts.SYSTEM_PROMPT
    assert "clean_vitals" in prompts.SYSTEM_PROMPT
    assert "health_alerts" in prompts.SYSTEM_PROMPT
    assert "HYBRID JSON OUTPUT FORMAT" in prompts.SYSTEM_PROMPT
