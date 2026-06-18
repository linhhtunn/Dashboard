import os
import sqlite3
import pytest
import app
from app.features.derived.renal import crcl
from app.features.derived.cv import cha2ds2_vasc, heart_failure_stage
from app.services.clinical.feature_service import FeatureService
from app.services.clinical.rule_engine import RuleEngine
from app.repositories.sqlite.patient_repository import SQLitePatientRepository
from app.repositories.ports.errors import RepositoryItemNotFoundError

# 1. Test CrCl calculations
def test_crcl_calculation():
    # Male: age 72, weight 72, creatinine 1.0 -> ((140-72) * 72) / (72 * 1.0) = 68.0
    res_male = crcl.extract({"age": 72, "gender": "Nam", "weight_kg": 72.0, "serum_creatinine": 1.0})
    assert res_male == 68.0

    # Female: age 72, weight 72, creatinine 1.0 -> 68.0 * 0.85 = 57.8
    res_female = crcl.extract({"age": 72, "gender": "Nu", "weight_kg": 72.0, "serum_creatinine": 1.0})
    assert res_female == 57.8

    # Edge cases
    assert crcl.extract({"age": 72, "gender": "Nam", "weight_kg": 72.0, "serum_creatinine": 0.0}) is None
    assert crcl.extract({"age": 72, "gender": "Nam", "weight_kg": 72.0, "serum_creatinine": -0.5}) is None
    assert crcl.extract({"age": None, "gender": "Nam", "weight_kg": 72.0, "serum_creatinine": 1.0}) is None

# 2. Test CHA2DS2-VASc calculation
def test_cha2ds2_vasc_calculation():
    # Male, age 76 (2 pts), hypertension (1 pt), diabetes (1 pt) -> 4 pts
    res_male = cha2ds2_vasc.extract({
        "age": 76,
        "gender": "Nam",
        "has_heart_failure": False,
        "has_hypertension": True,
        "has_stroke_history": False,
        "has_vascular_disease": False,
        "has_diabetes": True
    })
    assert res_male == 4

    # Female, age 50 (1 pt gender), no other risk factors -> 1 pt
    res_female = cha2ds2_vasc.extract({
        "age": 50,
        "gender": "Nu",
        "has_heart_failure": False,
        "has_hypertension": False,
        "has_stroke_history": False,
        "has_vascular_disease": False,
        "has_diabetes": False
    })
    assert res_female == 1

# 3. Test FeatureService dynamic scan & topological sort
def test_feature_service():
    service = FeatureService()
    service.load_plugins()
    
    # Assert plugins loaded
    assert "crcl" in service.extractors
    assert "cha2ds2_vasc" in service.extractors
    
    # Assert topological order has both
    assert "crcl" in service.ordered_features
    assert "cha2ds2_vasc" in service.ordered_features

    # Run extraction on a patient profile
    profile = {
        "age": 72,
        "gender": "Nam",
        "weight_kg": 72.0,
        "serum_creatinine": 1.0,
        "has_heart_failure": False,
        "has_hypertension": True,
        "has_stroke_history": False,
        "has_vascular_disease": True,
        "has_diabetes": False
    }
    extracted = service.extract_all(profile)
    assert extracted["crcl"] == 68.0
    assert extracted["cha2ds2_vasc"] == 3  # age 65-74 (+1), vascular_disease (+1), hypertension (+1)

# 4. Test SQLitePatientRepository
def test_sqlite_patient_repository():
    app_dir = os.path.dirname(app.__file__)
    db_path = os.path.join(app_dir, "fixtures", "mimic_demo.db")
    if not os.path.exists(db_path):
        pytest.skip("Optional mimic_demo.db fixture is not available")
    with sqlite3.connect(db_path) as conn:
        has_patients = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'hosp_patients'"
        ).fetchone()
    if not has_patients:
        pytest.skip("Optional mimic_demo.db fixture is not populated")
    
    repo = SQLitePatientRepository(db_path)
    
    # Fetch known patient
    patient = repo.get_by_id("10009628")
    assert patient["patient_id"] == "10009628"
    assert patient["gender"] == "Nam"
    assert patient["age"] == 58
    assert patient["is_af_confirmed"] is True
    assert patient["serum_creatinine"] == 1.0
    
    # Fetch missing patient
    with pytest.raises(RepositoryItemNotFoundError):
        repo.get_by_id("99999999")

# 5. Test RuleEngine condition evaluation and guidelines matching
def test_rule_engine():
    app_dir = os.path.dirname(app.__file__)
    rule_dir = os.path.join(os.path.dirname(app_dir), "rules", "af")
    
    engine = RuleEngine(rule_dir)
    engine.load_rules()
    
    # Ensure rules were loaded
    assert len(engine.rules) >= 1
    
    # Male patient, confirmed AF, CHA2DS2-VASc >= 2 -> DOAC recommended
    features = {
        "is_af_confirmed": True,
        "has_mechanical_valve": False,
        "gender": "Nam",
        "cha2ds2_vasc": 3
    }
    recommendations = engine.evaluate(features)
    assert "apixaban" in recommendations
    assert "rivaroxaban" in recommendations
    assert "dabigatran" in recommendations

    # Male patient, CHA2DS2-VASc = 1 -> No mandatory recommendation in these Class I rules
    features_low = {
        "is_af_confirmed": True,
        "has_mechanical_valve": False,
        "gender": "Nam",
        "cha2ds2_vasc": 1
    }
    recs_low = engine.evaluate(features_low)
    assert not recs_low


# 6. Test Heart Failure Stage calculation
def test_heart_failure_stage_calculation():
    # Stage C: diagnosed heart failure
    assert heart_failure_stage.extract({
        "has_heart_failure": True,
        "has_hypertension": False,
        "has_diabetes": False,
        "has_vascular_disease": False
    }) == "stage_c"

    # Stage A: at risk (no diagnosed HF, but has hypertension/diabetes/vascular disease)
    assert heart_failure_stage.extract({
        "has_heart_failure": False,
        "has_hypertension": True,
        "has_diabetes": False,
        "has_vascular_disease": False
    }) == "stage_a"

    # Normal: no HF or risk factors
    assert heart_failure_stage.extract({
        "has_heart_failure": False,
        "has_hypertension": False,
        "has_diabetes": False,
        "has_vascular_disease": False
    }) == "normal"


# 7. Test Heart Failure RuleEngine
def test_heart_failure_rule_engine():
    app_dir = os.path.dirname(app.__file__)
    rule_dir = os.path.join(os.path.dirname(app_dir), "rules", "heart_failure")

    engine = RuleEngine(rule_dir)
    engine.load_rules()

    # Ensure rules were loaded
    assert len(engine.rules) >= 1

    # Patient with Stage C (diagnosed HF) -> recommend ACEi, ARB, ARNI, beta blocker, MRA, SGLT2i
    features_c = {
        "has_heart_failure": True,
        "heart_failure_stage": "stage_c",
        "has_hyperkalemia": False,
        "is_pregnant": False,
        "has_bradycardia": False
    }
    recommendations_c = engine.evaluate(features_c)
    assert "arni" in recommendations_c
    assert "beta_blocker" in recommendations_c
    assert "mineralocorticoid_receptor_antagonist" in recommendations_c
    assert "sglt2_inhibitor" in recommendations_c

    # Patient with Stage C and hyperkalemia -> MRA should be blocked (removed from recommendations)
    features_hyperkalemia = {
        "has_heart_failure": True,
        "heart_failure_stage": "stage_c",
        "has_hyperkalemia": True,
        "is_pregnant": False,
        "has_bradycardia": False
    }
    recommendations_hk = engine.evaluate(features_hyperkalemia)
    assert "mineralocorticoid_receptor_antagonist" not in recommendations_hk
    assert "arni" in recommendations_hk
