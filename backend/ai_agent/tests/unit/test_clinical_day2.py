import os
import pytest
from app.services.clinical.rule_engine import RuleEngine
from app.services.clinical.drug_safety import DrugSafetyEngine

@pytest.fixture
def rule_engine():
    # Locate rules/af directory relative to this test file
    test_dir = os.path.dirname(__file__)  # backend/ai_agent/tests/unit
    base_dir = os.path.dirname(os.path.dirname(test_dir))  # backend/ai_agent
    rule_dir = os.path.join(base_dir, "rules", "af")
    engine = RuleEngine(rule_dir)
    engine.load_rules()
    return engine

@pytest.fixture
def safety_engine(rule_engine):
    return DrugSafetyEngine(rule_engine)

# 1. Test RuleEngine evaluate_overrides method
def test_rule_engine_evaluate_overrides(rule_engine):
    # Patient with mechanical valve
    features_valve = {"has_mechanical_valve": True, "cr_cl": 80, "current_medications": []}
    overrides = rule_engine.evaluate_overrides(features_valve)
    
    # Check that MECHANICAL_VALVE_CONTRAINDICATION is matched
    valve_overrides = [o for o in overrides if o["id"] == "MECHANICAL_VALVE_CONTRAINDICATION"]
    assert len(valve_overrides) == 1
    assert "warfarin" in valve_overrides[0]["action"]["force_recommend"]
    assert "apixaban" in valve_overrides[0]["action"]["block_drugs"]

    # Patient with severe renal failure
    features_renal = {"has_mechanical_valve": False, "cr_cl": 10, "current_medications": []}
    overrides_renal = rule_engine.evaluate_overrides(features_renal)
    renal_overrides = [o for o in overrides_renal if o["id"] == "SEVERE_RENAL_FAILURE_CONTRAINDICATION"]
    assert len(renal_overrides) == 1
    assert "apixaban" in renal_overrides[0]["action"]["block_drugs"]

# 2. Test RuleEngine contains operator (for current_medications DDI)
def test_contains_operator_ddi(rule_engine):
    # Patient taking ketoconazole
    features_ddi = {
        "has_mechanical_valve": False,
        "cr_cl": 80,
        "current_medications": ["Ketoconazole", "Lisinopril"]
    }
    overrides = rule_engine.evaluate_overrides(features_ddi)
    
    # APIs/drugs blocked
    blocked_ids = [o["id"] for o in overrides]
    assert "APIXABAN_KETOCONAZOLE_DDI" in blocked_ids
    assert "RIVAROXABAN_KETOCONAZOLE_DDI" in blocked_ids

# 3. Test DrugSafetyEngine candidate filtering & Warfarin fallback
def test_drug_safety_engine_warfarin_fallback(safety_engine):
    # If initial recommendation was DOACs, but patient has severe renal failure (CrCl = 12)
    clinical_features = {
        "has_mechanical_valve": False,
        "cr_cl": 12,
        "current_medications": []
    }
    recommended_drugs = ["apixaban", "rivaroxaban"]
    
    res = safety_engine.filter_drugs(clinical_features, recommended_drugs)
    
    # DOACs should be blocked
    assert "apixaban" in res["blocked_drugs"]
    assert "rivaroxaban" in res["blocked_drugs"]
    
    # Warfarin should be recommended as fallback since it's not contraindicated
    assert res["allowed_drugs"] == ["warfarin"]
    assert res["requires_laao"] is False

# 4. Test DrugSafetyEngine mechanical valve constraint
def test_drug_safety_engine_mechanical_valve(safety_engine):
    clinical_features = {
        "has_mechanical_valve": True,
        "cr_cl": 75,
        "current_medications": []
    }
    recommended_drugs = ["apixaban", "rivaroxaban", "dabigatran"]
    
    res = safety_engine.filter_drugs(clinical_features, recommended_drugs)
    
    assert "apixaban" in res["blocked_drugs"]
    assert "rivaroxaban" in res["blocked_drugs"]
    assert "dabigatran" in res["blocked_drugs"]
    assert "warfarin" in res["allowed_drugs"]
    assert res["requires_laao"] is False

# 5. Test DrugSafetyEngine LAAO emergency warning when all drugs are contraindicated
def test_drug_safety_engine_laao_emergency(safety_engine):
    # Patient with mechanical valve (forces Warfarin, blocks DOACs)
    # AND patient has warfarin contraindication or we mock warfarin blocked.
    # Since we don't have a direct rule blocking warfarin, let's inject a mock rule or block it.
    # Actually, we can test it by manually adding a custom block rule for warfarin or testing how filter_drugs handles it when warfarin is in blocked_drugs.
    # Let's mock the RuleEngine.evaluate_overrides to return a block on all DOACs and Warfarin.
    class MockRuleEngine:
        rules = [{"dummy": True}]
        def load_rules(self):
            pass
        def evaluate_overrides(self, clinical_features):
            return [
                {
                    "id": "BLOCK_DOACS",
                    "action": {"type": "override", "block_drugs": ["apixaban", "rivaroxaban", "dabigatran"]},
                    "reason": "Severe renal failure"
                },
                {
                    "id": "BLOCK_WARFARIN",
                    "action": {"type": "override", "block_drugs": ["warfarin"]},
                    "reason": "Active major bleeding"
                }
            ]
            
    mock_safety = DrugSafetyEngine(MockRuleEngine())
    res = mock_safety.filter_drugs({}, ["apixaban"])
    
    assert len(res["allowed_drugs"]) == 0
    assert res["requires_laao"] is True
    assert "LAAO" in res["warning"]
