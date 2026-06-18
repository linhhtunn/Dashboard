import re
from dataclasses import dataclass, field
from enum import StrEnum

from app.contracts.agent_response import AgentResponse


class PromptSafetyDecision(StrEnum):
    ALLOW = "ALLOW"
    WARN = "WARN"
    BLOCK = "BLOCK"


@dataclass(frozen=True)
class PromptSafetyResult:
    decision: PromptSafetyDecision
    reason: str
    matched_rules: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class ClinicalSafetyResult:
    safe: bool
    reason: str
    matched_rules: list[str] = field(default_factory=list)


BLOCK_PATTERNS = {
    "ignore_instructions": re.compile(r"\b(ignore|forget|disregard)\b.*\b(previous|system|developer)\b.*\b(instruction|prompt|rule)s?\b", re.I),
    "reveal_prompt": re.compile(r"\b(reveal|show|print|dump|expose)\b.*\b(system prompt|developer message|hidden instruction|secret)\b", re.I),
    "schema_bypass": re.compile(r"\b(do not|don't|stop)\b.*\b(json|schema|format|contract)\b", re.I),
    "secret_exfiltration": re.compile(r"\b(api key|token|password|secret|OPENAI_API_KEY)\b", re.I),
}

WARN_PATTERNS = {
    "medication_request": re.compile(r"\b(thuoc|thuốc|u[oố]ng|ke don|kê đơn|prescribe|medication|dose|dosage)\b", re.I),
    "definitive_advice": re.compile(r"\b(ch[aẩ]n đo[aá]n|ket luan|kết luận|definitive|diagnose|diagnosis)\b", re.I),
}

DEFINITIVE_DIAGNOSIS_PATTERNS = {
    "certain_vietnamese": re.compile(r"\b(chac chan bi|chắc chắn bị|ket luan .* bi|kết luận .* bị|duoc chan doan la|được chẩn đoán là)\b", re.I),
    "certain_english": re.compile(r"\b(definitely has|must be diagnosed with|is diagnosed with|conclusively has)\b", re.I),
}

PRESCRIPTION_PATTERNS = {
    "dose_with_action": re.compile(r"\b(uong|uống|dung|dùng|take|prescribe)\b.{0,40}\b\d+(\.\d+)?\s?(mg|ml|tablet|vien|viên|dose|li[eề]u)\b", re.I),
    "prescribe_instruction": re.compile(r"\b(prescribe|ke don|kê đơn)\b", re.I),
}

MEDICATION_MENTION_PATTERN = re.compile(
    r"\b(apixaban|rivaroxaban|dabigatran|edoxaban|warfarin|doac|vka|anticoagulant|kh[aá]ng [dđ][oô]ng|gợi ý dùng thuốc|chỉ định dùng thuốc|kê đơn thuốc)\b",
    re.I,
)

ADVISORY_PATTERNS = [
    re.compile(r"\b(ho tro|hỗ trợ|tham khảo|can kiem tra|cần kiểm tra|bac si|bác sĩ)\b", re.I),
    re.compile(r"\b(decision support|clinician|verify|clinical review|advisory)\b", re.I),
]

CDSS_GROUNDED_PATTERNS = [
    re.compile(r"\b(cdss|rule engine|tool output|guideline|deterministic)\b", re.I),
    re.compile(r"\b(allowed drugs|blocked drugs|thu[oố]c bi chan|thuốc bị chặn|goi y cdss|gợi ý cdss)\b", re.I),
]


def classify_prompt_injection(message: str) -> PromptSafetyResult:
    block_matches = [name for name, pattern in BLOCK_PATTERNS.items() if pattern.search(message)]
    if block_matches:
        return PromptSafetyResult(
            decision=PromptSafetyDecision.BLOCK,
            reason="Input attempts to override instructions, expose secrets, or bypass schema",
            matched_rules=block_matches,
        )

    warn_matches = [name for name, pattern in WARN_PATTERNS.items() if pattern.search(message)]
    if warn_matches:
        return PromptSafetyResult(
            decision=PromptSafetyDecision.WARN,
            reason="Input asks for sensitive clinical advice and needs stronger guardrails",
            matched_rules=warn_matches,
        )

    return PromptSafetyResult(
        decision=PromptSafetyDecision.ALLOW,
        reason="No prompt injection or sensitive clinical-advice pattern detected",
        matched_rules=[],
    )


def check_clinical_safety(response: AgentResponse) -> ClinicalSafetyResult:
    text = response.narrative_summary
    diagnosis_matches = [
        name for name, pattern in DEFINITIVE_DIAGNOSIS_PATTERNS.items() if pattern.search(text)
    ]
    if diagnosis_matches:
        return ClinicalSafetyResult(
            safe=False,
            reason="Response contains definitive diagnosis language",
            matched_rules=diagnosis_matches,
        )

    prescription_matches = [
        name for name, pattern in PRESCRIPTION_PATTERNS.items() if pattern.search(text)
    ]
    if prescription_matches:
        return ClinicalSafetyResult(
            safe=False,
            reason="Response contains prescription or medication dosing guidance",
            matched_rules=prescription_matches,
        )

    mentions_medication = MEDICATION_MENTION_PATTERN.search(text) is not None
    has_advisory_framing = any(pattern.search(text) for pattern in ADVISORY_PATTERNS)
    has_cdss_grounding = any(pattern.search(text) for pattern in CDSS_GROUNDED_PATTERNS)
    if mentions_medication and not (has_advisory_framing and has_cdss_grounding):
        return ClinicalSafetyResult(
            safe=False,
            reason="Medication suggestion is not framed as CDSS-grounded clinician decision support",
            matched_rules=["ungrounded_medication_recommendation"],
        )

    if has_advisory_framing:
        return ClinicalSafetyResult(
            safe=True,
            reason="Response is framed as clinical decision support",
            matched_rules=["advisory_framing"],
        )

    return ClinicalSafetyResult(
        safe=True,
        reason="No unsafe clinical pattern detected",
        matched_rules=[],
    )
