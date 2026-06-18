import json
from typing import Any

from app.agents.clinical.prompts import templates


def _json_context(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def _should_include_tool_output(tool_output: dict[str, Any] | None) -> bool:
    if not tool_output:
        return False
    return tool_output.get("tool_name") != "clinical.medical_search_tool"


def contract_instruction(response_type: str, patient_id: str | None, source_id: str) -> str:
    patient_clause = (
        "`patient_id` phai la null"
        if patient_id is None
        else f"`patient_id` phai la `{patient_id}`"
    )
    return (
        "Tra ve dung mot JSON object Contract 6 v1, khong boc trong Markdown. "
        f"`schema_version` phai la `v1`, `response_type` phai la `{response_type}`, "
        f"{patient_clause}, `source_id` phai la `{source_id}`. "
        "`generated_at` co the bo trong response vi backend se overwrite. "
        "`actions` la optional list. Neu tool output co actions, hay copy nguyen cac action hop le vao response.actions; "
        "moi action co `type`, `label`, va co the co `patient_id`, `hospital_patient_code`, `display_name`, `href`, `metadata`. "
        "Moi `visualizations.data_points` phai co `timestamp`, `metric`, `value`, `unit`, `status`. "
        "Moi `comparisons.comparison_type` phai thuoc: 'vitals-vs-activity', 'alert-evidence', hoac 'vitals-trend'. "
        "Moi dong trong `comparisons.rows` phai la mot list cac string dung thu tu voi `headers` (vi du: [[\"heart_rate\", \"78\", \"NORMAL\", \"Low movement\"]]), KHONG duoc la dictionary. "
        "Khong chan doan xac dinh. Duoc neu goi y thuoc/nhom thuoc chi khi dua tren CDSS/tool output duoc cung cap, "
        "phai noi ro day la ho tro quyet dinh lam sang cho bac si, khong phai don thuoc cuoi cung. "
        "Khong tu tao lieu dung/tan suat/thoi gian dung neu tool/rule khong cung cap. Neu thieu du lieu phai noi ro gioi han."
    )


def build_chat_prompt(
    *,
    patient: dict[str, Any],
    message: str,
    conversation_id: str | None,
    memory_context: str = "",
    long_term_watchlist: str = "",
    doctor_preferences: str = "",
    clinical_features: dict[str, Any] | None = None,
    allowed_drugs: list[str] | None = None,
    blocked_drugs: dict[str, str] | None = None,
    vitals_summary: dict[str, Any] | None = None,
    retrieved_evidence: list[str] | None = None,
    selected_intent: str | None = None,
    intent_arguments: dict[str, Any] | None = None,
    tool_output: dict[str, Any] | None = None,
    data_availability: dict[str, Any] | None = None,
    actions: list[dict[str, Any]] | None = None,
    needs_clarification: bool = False,
    clarifying_question: str | None = None,
) -> str:
    patient_id = patient.get("patient_id")
    source_id = conversation_id or patient_id or "DOCTOR_SCOPE"

    ltm_section = ""
    if long_term_watchlist:
        ltm_section += f"- Long-term Clinical Watchlist: {long_term_watchlist}\n"
    if doctor_preferences:
        ltm_section += f"- Doctor's Styling/Workflow Preferences: {doctor_preferences}\n"

    cdss_section = ""
    if clinical_features or allowed_drugs or blocked_drugs or vitals_summary or retrieved_evidence:
        cdss_section += "- Deterministic Clinical Safety Context (CDSS):\n"
        if clinical_features:
            cdss_section += f"  * Calculated Derived Features: {_json_context(clinical_features)}\n"
        if vitals_summary:
            cdss_section += f"  * Vital Signs Trend/Summary: {_json_context(vitals_summary)}\n"
        if allowed_drugs:
            cdss_section += f"  * Safe/Allowed Drugs: {', '.join(allowed_drugs)}\n"
        if blocked_drugs:
            cdss_section += f"  * Blocked/Contraindicated Drugs: {_json_context(blocked_drugs)}\n"
        if retrieved_evidence:
            cdss_section += "  * Clinical Guidelines & Safety Citations:\n"
            for ev in retrieved_evidence:
                cdss_section += f"    - {ev}\n"

    router_section = ""
    include_tool_output = _should_include_tool_output(tool_output)

    if selected_intent or include_tool_output or data_availability or actions or needs_clarification:
        router_section += "- Routed Chat Context:\n"
        router_section += f"  * Selected Intent: {selected_intent or 'general_chat'}\n"
        if intent_arguments:
            router_section += f"  * Intent Arguments: {_json_context(intent_arguments)}\n"
        if needs_clarification:
            router_section += f"  * Clarification Needed: {clarifying_question or 'Need more information.'}\n"
        if data_availability:
            router_section += f"  * Data Availability: {_json_context(data_availability)}\n"
        if include_tool_output and tool_output:
            router_section += f"  * Deterministic Tool Output: {_json_context(tool_output)}\n"
            if isinstance(tool_output, dict) and isinstance(tool_output.get("data"), dict):
                domain_name = tool_output["data"].get("domain_display_name")
                if domain_name:
                    router_section += f"  * Active Clinical Domain: {domain_name}\n"
        if actions:
            router_section += f"  * Allowed UI Actions: {_json_context(actions)}\n"

    medication_guardrail = (
        "- Medication Recommendation Guardrail: Neu tool output co `allowed_drugs`, co the trinh bay chung nhu "
        "goi y CDSS de bac si can nhac. Phai neu cac thuoc bi chan va ly do neu co. Luon yeu cau bac si "
        "kiem tra lai chong chi dinh, chuc nang than/gan, nguy co chay mau, tuong tac thuoc, guideline va "
        "ngu canh lam sang. Khong viet nhu mot menh lenh ke don va khong tu tao lieu dung.\n"
    )

    medical_qa_guardrail = ""
    if selected_intent == "general_medical_qa":
        medical_qa_guardrail = (
            "- Medical QA Grounding Guardrail: Bạn đang trả lời một câu hỏi y khoa tổng quát. "
            "Bạn BẮT BUỘC phải trả lời dựa TRÊN VÀ CHỈ TRÊN các tài liệu y văn được cung cấp trong phần "
            "'Clinical Guidelines & Safety Citations' ở trên. "
            "Với mỗi thông tin trích dẫn, hãy ghi rõ số thứ tự tài liệu dưới dạng [N] (ví dụ: [1], [2]) ngay sau nhận định y khoa tương ứng. "
            "Nếu tài liệu không chứa đủ thông tin để trả lời, bạn BẮT BUỘC phải trả lời: "
            "'Tôi không tìm thấy bằng chứng y văn chính thống cho câu hỏi này từ các nguồn được cấu hình.' "
            "Cấm tự bịa đặt thông tin hoặc đường dẫn liên kết ngoài bối cảnh được cung cấp.\n"
        )

    return (
        "Hay tra loi cau hoi cua bac si dua tren patient context duoc cung cap.\n"
        f"- Patient context: {_json_context(patient)}\n"
        f"- Conversation ID: {source_id}\n"
        f"- Server short-term memory: {memory_context or 'none yet.'}\n"
        f"{ltm_section}"
        f"{router_section}"
        f"{cdss_section}"
        f"{medication_guardrail}"
        f"{medical_qa_guardrail}"
        f"- User message: {message}\n\n"
        f"{contract_instruction('chat', patient_id, source_id)}"
    )
