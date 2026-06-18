import os
import pytest
import tempfile
import yaml
from app.services.clinical.medication_domain_registry import MedicationDomainRegistry


def test_registry_discovers_actual_domains() -> None:
    # Use the actual rules directory in the workspace
    current_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    rules_dir = os.path.join(current_dir, "rules")

    registry = MedicationDomainRegistry(rules_dir)
    registry.discover_domains()

    assert "af_anticoagulation" in registry.domains
    assert "hypertension" in registry.domains
    assert "heart_failure" in registry.domains

    af = registry.get_domain("af_anticoagulation")
    assert af is not None
    assert af.name == "Atrial Fibrillation Anticoagulation"
    assert "rung nhĩ" in af.keywords
    assert af.fallback_drugs == ["warfarin"]

    htn = registry.get_domain("hypertension")
    assert htn is not None
    assert htn.name == "Hypertension Medication Recommendation"
    assert "tăng huyết áp" in htn.keywords
    assert htn.fallback_drugs == []

    hf = registry.get_domain("heart_failure")
    assert hf is not None
    assert hf.name == "Heart Failure Medication Recommendation"
    assert "suy tim" in hf.keywords


def test_registry_keyword_matching() -> None:
    current_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    rules_dir = os.path.join(current_dir, "rules")

    registry = MedicationDomainRegistry(rules_dir)
    registry.discover_domains()

    # Exact AF matches
    assert registry.match_domain("Bệnh nhân rung nhĩ dùng thuốc gì?") == "af_anticoagulation"
    assert registry.match_domain("Chỉ định chống đông cho AF") == "af_anticoagulation"

    # Exact Hypertension matches
    assert registry.match_domain("Tư vấn thuốc tăng huyết áp") == "hypertension"
    assert registry.match_domain("Cao huyết áp dùng beta blocker") == "hypertension"

    # Exact Heart Failure matches
    assert registry.match_domain("Phác đồ điều trị suy tim") == "heart_failure"
    assert registry.match_domain("Thuốc cho bệnh nhân heart failure") == "heart_failure"

    # Unknown domain
    assert registry.match_domain("Bệnh nhân bị đau đầu uống gì?") is None

    # Ambiguous (matches both equally or multiple)
    assert registry.match_domain("Bệnh nhân vừa bị rung nhĩ vừa bị tăng huyết áp nên dùng gì?") is None


def test_registry_ignores_invalid_domain_dir() -> None:
    with tempfile.TemporaryDirectory() as tmpdir:
        # Empty folder
        registry = MedicationDomainRegistry(tmpdir)
        registry.discover_domains()
        assert len(registry.domains) == 0

        # Folder with domain.yaml but missing domain_id
        bad_domain_dir = os.path.join(tmpdir, "invalid_domain")
        os.makedirs(bad_domain_dir)
        with open(os.path.join(bad_domain_dir, "domain.yaml"), "w") as f:
            yaml.dump({"name": "No ID"}, f)
        
        registry.discover_domains()
        assert len(registry.domains) == 0
