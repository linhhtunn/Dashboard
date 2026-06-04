from app.fallback import build_summary_fallback as legacy_build_summary_fallback
from app.safety import classify_prompt_injection as legacy_classify_prompt_injection
from app.services.fallback import build_summary_fallback
from app.services.safety import classify_prompt_injection


def test_legacy_fallback_facade_reexports_service_function() -> None:
    assert legacy_build_summary_fallback is build_summary_fallback


def test_legacy_safety_facade_reexports_service_function() -> None:
    assert legacy_classify_prompt_injection is classify_prompt_injection
