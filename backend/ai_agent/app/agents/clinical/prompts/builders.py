import json
from typing import Any

from app.agents.clinical.prompts import templates


def _json_context(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def contract_instruction(response_type: str, patient_id: str, source_id: str) -> str:
    return (
        "Tra ve dung mot JSON object Contract 6 v1, khong boc trong Markdown. "
        f"`schema_version` phai la `v1`, `response_type` phai la `{response_type}`, "
        f"`patient_id` phai la `{patient_id}`, `source_id` phai la `{source_id}`. "
        "`generated_at` co the bo trong response vi backend se overwrite. "
        "Moi `visualizations.data_points` phai co `timestamp`, `metric`, `value`, `unit`, `status`. "
        "Moi `comparisons.comparison_type` phai thuoc: 'vitals-vs-activity', 'alert-evidence', hoac 'vitals-trend'. "
        "Moi dong trong `comparisons.rows` phai la mot list cac string dung thu tu voi `headers` (vi du: [[\"heart_rate\", \"78\", \"NORMAL\", \"Low movement\"]]), KHONG duoc la dictionary. "
        "Khong chan doan xac dinh, khong ke don thuoc, va neu thieu du lieu phai noi ro gioi han."
    )


def build_summary_prompt(patient: dict[str, Any]) -> str:
    patient_id = patient["patient_id"]
    body = templates.SUMMARY_PROMPT_TEMPLATE.format(
        patient_name=patient["name"],
        patient_age=patient["age"],
        patient_gender=patient["gender"],
        patient_id=patient_id,
        medical_history=patient["medical_history"],
        vitals_data=_json_context(patient["recent_vitals"]),
        alerts_data=_json_context(patient["recent_alerts"]),
    )
    return f"{body}\n\n{contract_instruction('summary', patient_id, patient_id)}"


def build_explain_alert_prompt(alert: dict[str, Any], patient: dict[str, Any]) -> str:
    patient_id = patient["patient_id"]
    alert_id = alert["alert_id"]
    body = templates.EXPLAIN_ALERT_PROMPT_TEMPLATE.format(
        patient_name=patient["name"],
        patient_id=patient_id,
        medical_history=patient["medical_history"],
        alert_detail=_json_context(
            {
                "alert_id": alert_id,
                "timestamp": alert["timestamp"],
                "alert_type": alert["alert_type"],
                "health_status": alert["health_status"],
                "severity": alert["severity"],
                "confidence": alert["confidence"],
                "message": alert["message"],
                "evidence": alert["evidence"],
            }
        ),
        sensor_context=_json_context(alert["sensor_context"]),
    )
    return f"{body}\n\n{contract_instruction('explain-alert', patient_id, alert_id)}"


def build_chat_prompt(
    *,
    patient: dict[str, Any],
    message: str,
    conversation_id: str | None,
    memory_context: str = "",
    long_term_watchlist: str = "",
    doctor_preferences: str = "",
) -> str:
    patient_id = patient["patient_id"]
    source_id = conversation_id or patient_id

    ltm_section = ""
    if long_term_watchlist:
        ltm_section += f"- Long-term Clinical Watchlist: {long_term_watchlist}\n"
    if doctor_preferences:
        ltm_section += f"- Doctor's Styling/Workflow Preferences: {doctor_preferences}\n"

    return (
        "Hay tra loi cau hoi cua bac si dua tren patient context duoc cung cap.\n"
        f"- Patient context: {_json_context(patient)}\n"
        f"- Conversation ID: {source_id}\n"
        f"- Server short-term memory: {memory_context or 'none yet.'}\n"
        f"{ltm_section}"
        f"- User message: {message}\n\n"
        f"{contract_instruction('chat', patient_id, source_id)}"
    )
