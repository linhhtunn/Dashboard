from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass

from pydantic import ValidationError

from app.infrastructure.llm.ports import LLMProvider
from app.services.intent.models import ChatIntent, IntentArguments, IntentClassification
from app.services.parsers.agent_response_parser import LLMOutputParseError, parse_json_object
from app.services.clinical.medication_domain_registry import MedicationDomainRegistry


ALERT_ID_PATTERN = re.compile(r"\b(?:alert|canh bao|cảnh báo)[\s:_#-]*([A-Za-z0-9_-]{3,})\b", re.I)
WINDOW_PATTERN = re.compile(r"\b(\d{1,4})\s*(?:minutes?|mins?|phut|phút)\b", re.I)
PATIENT_CODE_PATTERN = re.compile(r"\bP\d{1,3}\b", re.I)
SUBJECT_ID_PATTERN = re.compile(r"\b\d{5,}\b")


@dataclass(frozen=True)
class IntentClassifier:
    llm_provider: LLMProvider | None = None
    use_llm: bool = False
    min_confidence: float = 0.55
    domain_registry: MedicationDomainRegistry | None = None

    async def classify(
        self,
        *,
        message: str,
        patient_id: str | None,
        metadata: dict | None = None,
    ) -> IntentClassification:
        deterministic = self.classify_deterministic(
            message=message,
            patient_id=patient_id,
            metadata=metadata,
        )
        should_try_llm = (
            self.use_llm
            and self.llm_provider is not None
            and deterministic.intent in {ChatIntent.UNKNOWN, ChatIntent.GENERAL_CHAT}
        )
        if not should_try_llm:
            return deterministic

        try:
            return await self.classify_with_llm(
                message=message,
                patient_id=patient_id,
                metadata=metadata,
            )
        except Exception:
            return self._general_chat(patient_id=patient_id)

    def classify_deterministic(
        self,
        *,
        message: str,
        patient_id: str | None,
        metadata: dict | None = None,
    ) -> IntentClassification:
        metadata = metadata or {}
        text = message.strip()
        normalized = text.lower()
        normalized_ascii = _normalize_text(text)
        args = IntentArguments(
            patient_id=patient_id,
            alert_id=_metadata_str(metadata, "alert_id") or _extract_alert_id(text),
            time_window_minutes=_metadata_int(metadata, "time_window_minutes") or _extract_window(text),
            query=text,
            hospital_patient_code=_metadata_str(metadata, "hospital_patient_code") or _extract_patient_code(text),
            subject_id=_metadata_str(metadata, "subject_id") or _extract_subject_id(text),
        )

        if _is_greeting(normalized_ascii):
            return self._general_chat(patient_id=patient_id)

        named_patient_query = _extract_named_patient_query(text)
        if not patient_id and named_patient_query:
            args.query = named_patient_query
            return IntentClassification(
                intent=ChatIntent.PATIENT_LOOKUP,
                confidence=0.87,
                arguments=args,
            )

        if _is_patient_lookup(normalized, text):
            args.query = _extract_lookup_query(text) or text
            return IntentClassification(
                intent=ChatIntent.PATIENT_LOOKUP,
                confidence=0.9,
                arguments=args,
            )

        if _is_doctor_overview(normalized):
            return IntentClassification(
                intent=ChatIntent.DOCTOR_PATIENT_OVERVIEW,
                confidence=0.88,
                arguments=args,
            )

        if _has_any(normalized, ["summary", "summarize", "tom tat", "tóm tắt", "tong quan", "tổng quan"]):
            return IntentClassification(
                intent=ChatIntent.PATIENT_SUMMARY,
                confidence=0.9,
                arguments=args,
            )

        if _is_general_medical_qa(normalized):
            return IntentClassification(
                intent=ChatIntent.GENERAL_MEDICAL_QA,
                confidence=0.85,
                arguments=args,
            )

        is_med_req = (
            _has_any(normalized, ["tang huyet ap", "tăng huyết áp", "huyet ap cao", "huyết áp cao", "blood pressure", "hypertension", "antihypertensive"])
            and _has_any(normalized, ["thuoc", "thuốc", "medication", "drug", "prescribe", "ke don", "kê đơn", "dieu tri", "điều trị"])
        ) or _has_any(
            normalized,
            [
                "thuoc",
                "thuốc",
                "dong mau",
                "đông máu",
                "chong dong",
                "chống đông",
                "medication",
                "drug",
                "prescribe",
                "ke don",
                "kê đơn",
                "anticoag",
                "doac",
                "warfarin",
                "apixaban",
                "rivaroxaban",
                "dabigatran",
                "rung nhi",
                "rung nhĩ",
                "eligibility",
                "eligible",
                "trich dan y van",
                "trích dẫn y văn",
            ],
        )

        if is_med_req:
            resolved_domain = None
            needs_clarification = False
            clarifying_question = None

            if self.domain_registry:
                resolved_domain = _metadata_str(metadata, "medication_domain")
                if not resolved_domain:
                    resolved_domain = self.domain_registry.match_domain(text)
                
                if not resolved_domain:
                    needs_clarification = True
                    clarifying_question = "Vui lòng cho biết bạn cần kê đơn/tư vấn thuốc cho bệnh lý nào (ví dụ: rung nhĩ, tăng huyết áp)?"
            
            args.medication_domain = resolved_domain
            return IntentClassification(
                intent=ChatIntent.MEDICATION_RECOMMENDATION,
                confidence=0.88,
                arguments=args,
                needs_clarification=needs_clarification,
                clarifying_question=clarifying_question,
            )

        if _has_any(normalized, ["explain alert", "alert", "canh bao", "cảnh báo"]):
            is_specific_this = _has_any(normalized, ["nay", "này", "this"])
            needs_alert_id = args.alert_id is None and (args.patient_id is None or is_specific_this)
            return IntentClassification(
                intent=ChatIntent.EXPLAIN_ALERT,
                confidence=0.82 if not needs_alert_id else 0.62,
                arguments=args,
                needs_clarification=needs_alert_id,
                clarifying_question="Vui lòng cung cấp alert_id để tôi giải thích đúng cảnh báo.",
            )

        if _has_any(
            normalized,
            [
                "vitals",
                "vital",
                "heart rate",
                "nhip tim",
                "nhịp tim",
                "spo2",
                "blood pressure",
                "huyet ap",
                "huyết áp",
                "trend",
                "xu huong",
                "xu hướng",
            ],
        ):
            return IntentClassification(
                intent=ChatIntent.VITALS_TREND,
                confidence=0.84,
                arguments=args,
            )

        if _is_out_of_scope(normalized):
            return IntentClassification(
                intent=ChatIntent.OUT_OF_SCOPE,
                confidence=0.94,
                arguments=args,
            )

        return self._general_chat(patient_id=patient_id)

    async def classify_with_llm(
        self,
        *,
        message: str,
        patient_id: str | None,
        metadata: dict | None = None,
    ) -> IntentClassification:
        if self.llm_provider is None:
            return self._general_chat(patient_id=patient_id)

        system_prompt = (
            "You classify clinical assistant chat messages. Return exactly one JSON object. "
            "Allowed intents: patient_summary, explain_alert, medication_recommendation, "
            "vitals_trend, doctor_patient_overview, patient_lookup, general_chat, general_medical_qa, out_of_scope, unknown. Do not answer the user. "
            "Use 'general_medical_qa' for general medical questions, symptom checks, disease classifications, drug mechanisms, or clinical guidelines that do not depend on specific patient data. "
            "CRITICAL RULE: Any user message that is NOT related to medicine, healthcare, patients, clinical data, "
            "or hospital workflows MUST be classified as 'out_of_scope'."
        )
        user_prompt = json.dumps(
            {
                "message": message,
                "patient_id": patient_id,
                "metadata": metadata or {},
                "schema": {
                    "intent": "string",
                    "confidence": "number 0..1",
                    "arguments": {
                        "patient_id": "string|null",
                        "alert_id": "string|null",
                        "time_window_minutes": "integer|null",
                        "query": "string|null (extracted patient name or search keyword only, e.g. 'Nguyen Van A')",
                        "hospital_patient_code": "string|null (hospital patient code, e.g. 'P001')",
                        "subject_id": "string|null (numeric subject ID, e.g. '10000032')",
                        "medication_domain": "string|null",
                    },
                    "needs_clarification": "boolean",
                    "clarifying_question": "string|null",
                },
            },
            ensure_ascii=False,
        )
        response = await self.llm_provider.generate_text(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.0,
        )
        try:
            payload = parse_json_object(response.content)
            classification = IntentClassification.model_validate(payload)
        except (LLMOutputParseError, ValidationError):
            return self._general_chat(patient_id=patient_id)

        if classification.arguments.patient_id is None:
            classification.arguments.patient_id = patient_id

        if classification.intent == ChatIntent.MEDICATION_RECOMMENDATION:
            if not classification.arguments.medication_domain:
                resolved = None
                if self.domain_registry:
                    resolved = _metadata_str(metadata, "medication_domain") or self.domain_registry.match_domain(message)
                if resolved:
                    classification.arguments.medication_domain = resolved
                else:
                    classification.needs_clarification = True
                    classification.clarifying_question = "Vui lòng cho biết bạn cần kê đơn/tư vấn thuốc cho bệnh lý nào (ví dụ: rung nhĩ, tăng huyết áp)?"

        return classification

    def _general_chat(self, *, patient_id: str | None) -> IntentClassification:
        return IntentClassification(
            intent=ChatIntent.GENERAL_CHAT,
            confidence=0.7,
            arguments=IntentArguments(patient_id=patient_id),
        )


def _has_any(text: str, needles: list[str]) -> bool:
    return any(needle in text for needle in needles)


def _normalize_text(value: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return " ".join(ascii_text.lower().split())


def _is_greeting(normalized_ascii: str) -> bool:
    cleaned = normalized_ascii.strip(" .,!?:;-")
    return cleaned in {
        "chao",
        "xin chao",
        "hello",
        "hi",
        "hey",
        "alo",
        "good morning",
        "good afternoon",
        "good evening",
    }


def _extract_named_patient_query(text: str) -> str | None:
    words = re.findall(r"\w+", text, flags=re.UNICODE)
    if not words:
        return None

    normalized_words = [_normalize_text(word) for word in words]
    start_index = None
    for index, word in enumerate(normalized_words):
        if word == "patient":
            start_index = index + 1
            break
        if word == "benh":
            start_index = index + 1
            if start_index < len(normalized_words) and normalized_words[start_index].startswith("nh"):
                start_index += 1
            break

    if start_index is None or start_index >= len(words):
        return None

    stop_words = {
        "co",
        "dang",
        "khoe",
        "khong",
        "hien",
        "tai",
        "the",
        "nao",
        "ra",
        "sao",
        "tinh",
        "trang",
        "suc",
        "nay",
        "do",
        "la",
        "gi",
    }
    name_words: list[str] = []
    for original_word, normalized_word in zip(words[start_index:], normalized_words[start_index:]):
        if normalized_word in stop_words:
            break
        name_words.append(original_word)

    candidate = " ".join(name_words).strip()
    normalized_candidate = _normalize_text(candidate)
    normalized_name_words = normalized_candidate.split()
    if len(normalized_candidate) < 2 or normalized_candidate in stop_words:
        return None
    if len(normalized_name_words) > 4:
        return None
    if normalized_name_words and normalized_name_words[0] in {
        "tang",
        "huyet",
        "ap",
        "rung",
        "nhi",
        "thuoc",
        "sot",
        "dau",
        "ho",
        "suy",
        "tim",
        "tieu",
        "duong",
        "trieu",
        "chung",
    }:
        return None
    if not re.search(r"[A-Za-z]", normalized_candidate):
        return None
    return candidate



def _is_out_of_scope(text: str) -> bool:
    clinical_terms = [
        "benh",
        "bệnh",
        "patient",
        "bac si",
        "bác sĩ",
        "y te",
        "y tế",
        "lam sang",
        "lâm sàng",
        "sinh hieu",
        "sinh hiệu",
        "canh bao",
        "cảnh báo",
        "thuoc",
        "thuốc",
        "rung nhi",
        "rung nhĩ",
        "tim",
        "heart",
        "vitals",
        "alert",
        "cdss",
        "clinical",
        "nguy hiem",
        "nguy hiểm",
        "theo doi",
        "theo dõi",
        "tim benh nhan",
        "tìm bệnh nhân",
        "mo benh nhan",
        "mở bệnh nhân",
    ]
    if _has_any(text, clinical_terms):
        return False

    out_of_scope_terms = [
        "thu do",
        "thủ đô",
        "capital",
        "weather",
        "thoi tiet",
        "thời tiết",
        "joke",
        "truyen cuoi",
        "truyện cười",
        "programming",
        "lap trinh",
        "lập trình",
        "bong da",
        "bóng đá",
        "lich su",
        "lịch sử",
        "dia ly",
        "địa lý",
        "viet nam o dau",
        "việt nam ở đâu",
    ]
    return _has_any(text, out_of_scope_terms)



def _is_general_medical_qa(text: str) -> bool:
    medical_qa_terms = [
        "co che", "cơ chế", "tac dung", "tác dụng", "tac dung phu", "tác dụng phụ", "side effect",
        "phac do", "phác đồ", "huong dan dieu tri", "hướng dẫn điều trị", "guideline",
        "chan doan", "chẩn đoán", "tieu chuan", "tiêu chuẩn", "criteria",
        "trieu chung", "triệu chứng", "symptom",
        "la gi", "là gì", "dinh nghia", "định nghĩa",
        "benh gi", "bệnh gì",
    ]
    if _has_any(text, medical_qa_terms):
        return True

    # Check acronyms with word boundaries
    acronyms = ["acc/aha", "esc", "gold", "ada"]
    for acronym in acronyms:
        pattern = rf"\b{re.escape(acronym)}\b"
        if re.search(pattern, text, re.IGNORECASE):
            return True

    return False


def _metadata_str(metadata: dict, key: str) -> str | None:
    value = metadata.get(key)
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _metadata_int(metadata: dict, key: str) -> int | None:
    value = metadata.get(key)
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.isdigit():
        return int(value)
    return None


def _extract_patient_code(text: str) -> str | None:
    match = PATIENT_CODE_PATTERN.search(text)
    if not match:
        return None
    raw = match.group(0).upper()
    return f"P{int(raw[1:]):03d}"


def _extract_subject_id(text: str) -> str | None:
    match = SUBJECT_ID_PATTERN.search(text)
    return match.group(0) if match else None


def _extract_lookup_query(text: str) -> str | None:
    cleaned = re.sub(
        r"(?i)\b(?:toi|tôi|minh|mình)?\s*(?:muon|muốn|can|cần)?\s*(?:tim|tìm|mo|mở|search|find|open)\s+(?:benh nhan|bệnh nhân|patient)\b",
        "",
        text,
    )
    cleaned = re.sub(r"(?i)\b(?:toi|tôi|minh|mình)\s+(?:muon|muốn|can|cần)\b", "", cleaned)
    cleaned = re.sub(r"(?i)\b(?:benh nhan|bệnh nhân|patient)\b", "", cleaned)
    cleaned = cleaned.strip(" :#-")
    return cleaned or None


def _is_patient_lookup(normalized: str, original: str) -> bool:
    normalized_ascii = _normalize_text(original)
    if (_extract_patient_code(original) or _extract_subject_id(original)) and _has_any(
        normalized_ascii,
        ["tim", "mo", "open", "find", "search", "benh nhan", "patient"],
    ):
        return True
    if _has_any(
        normalized_ascii,
        [
            "tim benh nhan",
            "mo benh nhan",
            "open patient",
            "find patient",
            "search patient",
            "cho toi xem benh nhan",
        ],
    ):
        return True
    if _extract_patient_code(original) or _extract_subject_id(original):
        return _has_any(
            normalized,
            [
                "tim",
                "tìm",
                "mo",
                "mở",
                "open",
                "find",
                "search",
                "benh nhan",
                "bệnh nhân",
                "patient",
            ],
        )
    return _has_any(
        normalized,
        [
            "tim benh nhan",
            "tìm bệnh nhân",
            "mo benh nhan",
            "mở bệnh nhân",
            "open patient",
            "find patient",
            "search patient",
            "cho toi xem benh nhan",
            "cho tôi xem bệnh nhân",
        ],
    )


def _is_doctor_overview(normalized: str) -> bool:
    patient_list_terms = [
        "nhung benh nhan",
        "những bệnh nhân",
        "benh nhan nao",
        "bệnh nhân nào",
        "danh sach benh nhan",
        "danh sách bệnh nhân",
        "patients",
        "patient list",
    ]
    risk_terms = [
        "nguy hiem",
        "nguy hiểm",
        "can theo doi",
        "cần theo dõi",
        "theo doi",
        "theo dõi",
        "bat thuong",
        "bất thường",
        "alert",
        "canh bao",
        "cảnh báo",
        "critical",
        "danger",
        "risky",
    ]
    return _has_any(normalized, patient_list_terms) and _has_any(normalized, risk_terms)


def _extract_alert_id(message: str) -> str | None:
    match = ALERT_ID_PATTERN.search(message)
    if match:
        return match.group(1)
    return None


def _extract_window(message: str) -> int | None:
    match = WINDOW_PATTERN.search(message)
    if match:
        return int(match.group(1))
    return None
