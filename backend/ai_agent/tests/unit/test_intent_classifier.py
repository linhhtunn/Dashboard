import json

import pytest

from app.infrastructure.llm.ports import LLMResponse
from app.services.intent import ChatIntent, IntentClassifier


class FakeIntentLLM:
    def __init__(self, payload: dict) -> None:
        self.payload = payload
        self.calls = 0

    async def generate_text(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
    ) -> LLMResponse:
        self.calls += 1
        return LLMResponse(
            content=json.dumps(self.payload),
            model="fake",
            latency_ms=1.0,
        )


@pytest.mark.asyncio
async def test_classifier_detects_summary_intent() -> None:
    classifier = IntentClassifier()

    result = await classifier.classify(
        message="Tóm tắt bệnh nhân này giúp tôi",
        patient_id="P001",
    )

    assert result.intent == ChatIntent.PATIENT_SUMMARY
    assert result.confidence >= 0.8
    assert result.arguments.patient_id == "P001"


@pytest.mark.asyncio
async def test_classifier_requires_alert_id_for_alert_explanation() -> None:
    classifier = IntentClassifier()

    result = await classifier.classify(
        message="Giải thích cảnh báo này",
        patient_id="P001",
    )

    assert result.intent == ChatIntent.EXPLAIN_ALERT
    assert result.needs_clarification is True
    assert result.clarifying_question


@pytest.mark.asyncio
async def test_classifier_uses_alert_id_from_metadata() -> None:
    classifier = IntentClassifier()

    result = await classifier.classify(
        message="Giải thích cảnh báo này",
        patient_id="P001",
        metadata={"alert_id": "ALT_123"},
    )

    assert result.intent == ChatIntent.EXPLAIN_ALERT
    assert result.arguments.alert_id == "ALT_123"
    assert result.needs_clarification is False


@pytest.mark.asyncio
async def test_classifier_detects_medication_intent() -> None:
    from app.services.clinical import MedicationDomainRegistry
    domain_registry = MedicationDomainRegistry("rules")
    domain_registry.discover_domains()
    classifier = IntentClassifier(domain_registry=domain_registry)

    result = await classifier.classify(
        message="Bệnh nhân này dùng apixaban hay warfarin được không? rung nhĩ",
        patient_id="P001",
    )

    assert result.intent == ChatIntent.MEDICATION_RECOMMENDATION
    assert result.arguments.medication_domain == "af_anticoagulation"
    assert result.is_actionable()


@pytest.mark.asyncio
async def test_classifier_detects_hypertension_medication_intent() -> None:
    from app.services.clinical import MedicationDomainRegistry
    domain_registry = MedicationDomainRegistry("rules")
    domain_registry.discover_domains()
    classifier = IntentClassifier(domain_registry=domain_registry)

    result = await classifier.classify(
        message="Bệnh nhân tăng huyết áp nên cân nhắc thuốc gì?",
        patient_id="P001",
    )

    assert result.intent == ChatIntent.MEDICATION_RECOMMENDATION
    assert result.arguments.medication_domain == "hypertension"
    assert result.is_actionable()


@pytest.mark.asyncio
async def test_classifier_prioritizes_medication_over_generic_explanation_wording() -> None:
    from app.services.clinical import MedicationDomainRegistry
    domain_registry = MedicationDomainRegistry("rules")
    domain_registry.discover_domains()
    classifier = IntentClassifier(domain_registry=domain_registry)

    result = await classifier.classify(
        message=(
            "Bác sĩ khuyên tôi nên dùng thuốc đông máu nào cho tình trạng Rung Nhĩ của tôi? "
            "Hãy giải thích và nêu rõ trích dẫn y văn."
        ),
        patient_id="P001",
    )

    assert result.intent == ChatIntent.MEDICATION_RECOMMENDATION
    assert result.arguments.medication_domain == "af_anticoagulation"
    assert result.needs_clarification is False


@pytest.mark.asyncio
async def test_classifier_requires_clarification_for_ambiguous_medication() -> None:
    from app.services.clinical import MedicationDomainRegistry
    domain_registry = MedicationDomainRegistry("rules")
    domain_registry.discover_domains()
    classifier = IntentClassifier(domain_registry=domain_registry)

    result = await classifier.classify(
        message="Kê thuốc cho bệnh nhân này",
        patient_id="P001",
    )

    assert result.intent == ChatIntent.MEDICATION_RECOMMENDATION
    assert result.arguments.medication_domain is None
    assert result.needs_clarification is True
    assert "Vui lòng cho biết" in result.clarifying_question


@pytest.mark.asyncio
async def test_classifier_falls_back_to_general_chat_for_unknown_text() -> None:
    classifier = IntentClassifier()

    result = await classifier.classify(
        message="Hôm nay tình hình thế nào?",
        patient_id="P001",
    )

    assert result.intent == ChatIntent.GENERAL_CHAT
    assert result.confidence >= 0.55


@pytest.mark.asyncio
async def test_classifier_allows_plain_greeting_without_patient() -> None:
    classifier = IntentClassifier()

    result = await classifier.classify(
        message="chào",
        patient_id=None,
    )

    assert result.intent == ChatIntent.GENERAL_CHAT
    assert result.arguments.patient_id is None


@pytest.mark.asyncio
async def test_classifier_does_not_let_llm_override_patient_context_general_chat() -> None:
    llm = FakeIntentLLM(
        {
            "intent": "out_of_scope",
            "confidence": 1.0,
            "arguments": {"patient_id": None},
            "needs_clarification": False,
            "clarifying_question": None,
        }
    )
    classifier = IntentClassifier(llm_provider=llm, use_llm=True)

    result = await classifier.classify(
        message="Bệnh nhân có đang khỏe không?",
        patient_id="P001",
        metadata={"context_type": "patient_chat"},
    )

    assert llm.calls == 0
    assert result.intent == ChatIntent.GENERAL_CHAT
    assert result.arguments.patient_id == "P001"


@pytest.mark.asyncio
async def test_classifier_detects_doctor_patient_overview_without_patient_id() -> None:
    classifier = IntentClassifier()

    result = await classifier.classify(
        message="Hôm nay có những bệnh nhân nào nguy hiểm cần theo dõi?",
        patient_id=None,
    )

    assert result.intent == ChatIntent.DOCTOR_PATIENT_OVERVIEW
    assert result.arguments.patient_id is None


@pytest.mark.asyncio
async def test_classifier_detects_patient_lookup_by_name_and_code() -> None:
    classifier = IntentClassifier()

    by_name = await classifier.classify(
        message="Tìm bệnh nhân Nguyễn Văn A",
        patient_id=None,
    )
    by_code = await classifier.classify(
        message="Mở bệnh nhân P001",
        patient_id=None,
    )

    assert by_name.intent == ChatIntent.PATIENT_LOOKUP
    assert by_name.arguments.query == "Nguyễn Văn A"
    assert by_code.intent == ChatIntent.PATIENT_LOOKUP
    assert by_code.arguments.hospital_patient_code == "P001"


@pytest.mark.asyncio
async def test_classifier_detects_patient_lookup_from_health_question_by_name() -> None:
    classifier = IntentClassifier()

    full_name = await classifier.classify(
        message="Bệnh nhân Nguyễn Văn Hùng có đang khỏe không",
        patient_id=None,
    )
    partial_name = await classifier.classify(
        message="Bệnh nhâ Hung có khỏe không",
        patient_id=None,
    )

    assert full_name.intent == ChatIntent.PATIENT_LOOKUP
    assert full_name.arguments.query == "Nguyễn Văn Hùng"
    assert partial_name.intent == ChatIntent.PATIENT_LOOKUP
    assert partial_name.arguments.query == "Hung"


@pytest.mark.asyncio
async def test_classifier_does_not_treat_condition_after_patient_word_as_name() -> None:
    classifier = IntentClassifier()

    result = await classifier.classify(
        message="Benh nhan tang huyet ap nen dung thuoc gi?",
        patient_id=None,
    )

    assert result.intent == ChatIntent.MEDICATION_RECOMMENDATION


@pytest.mark.asyncio
async def test_classifier_cleans_polite_patient_lookup_prefix() -> None:
    classifier = IntentClassifier()

    result = await classifier.classify(
        message="Tôi muốn tìm bệnh nhân Nguyen Van C",
        patient_id=None,
    )

    assert result.intent == ChatIntent.PATIENT_LOOKUP
    assert result.arguments.query == "Nguyen Van C"


@pytest.mark.asyncio
async def test_classifier_marks_non_clinical_question_out_of_scope() -> None:
    classifier = IntentClassifier()

    result = await classifier.classify(
        message="Thủ đô của Việt Nam ở đâu?",
        patient_id="P001",
    )

    assert result.intent == ChatIntent.OUT_OF_SCOPE


@pytest.mark.asyncio
async def test_classifier_can_parse_llm_json_when_enabled() -> None:
    llm = FakeIntentLLM(
        {
            "intent": "vitals_trend",
            "confidence": 0.92,
            "arguments": {
                "patient_id": "P001",
                "alert_id": None,
                "time_window_minutes": 60,
            },
            "needs_clarification": False,
            "clarifying_question": None,
        }
    )
    classifier = IntentClassifier(llm_provider=llm, use_llm=True)

    result = await classifier.classify(
        message="please inspect the telemetry",
        patient_id="P001",
    )

    assert llm.calls == 1
    assert result.intent == ChatIntent.VITALS_TREND
    assert result.arguments.time_window_minutes == 60


@pytest.mark.asyncio
async def test_classifier_detects_general_medical_qa_intent() -> None:
    classifier = IntentClassifier()

    by_guideline = await classifier.classify(
        message="Phác đồ điều trị suy tim mới nhất",
        patient_id="P001",
    )
    by_mechanism = await classifier.classify(
        message="Cơ chế tác động của thuốc sacubitril là gì?",
        patient_id="P001",
    )

    assert by_guideline.intent == ChatIntent.GENERAL_MEDICAL_QA
    assert by_mechanism.intent == ChatIntent.GENERAL_MEDICAL_QA
