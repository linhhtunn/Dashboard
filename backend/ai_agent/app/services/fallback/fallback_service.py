from app.contracts.agent_response import (
    AgentResponse,
    ChatIntent,
    Comparison,
    ComparisonType,
    ResponseType,
    Visualization,
)


def _empty_visualization() -> Visualization:
    return Visualization(
        has_chart=False,
        chart_type="time-series",
        chart_title="",
        data_points=[],
    )


def _empty_comparison(comparison_type: ComparisonType) -> Comparison:
    return Comparison(
        has_comparison=False,
        comparison_type=comparison_type,
        headers=[],
        rows=[],
    )


def build_chat_fallback(
    *,
    patient_id: str,
    conversation_id: str | None = None,
    reason: str = "Yeu cau khong the xu ly an toan trong luc nay.",
) -> AgentResponse:
    source_id = conversation_id or patient_id
    return AgentResponse(
        schema_version="v1",
        response_type=ResponseType.CHAT,
        patient_id=patient_id,
        source_id=source_id,
        intent=ChatIntent.GENERAL_CHAT,
        narrative_summary=(
            "### Phan hoi an toan\n"
            f"{reason} Vui long kiem tra lai noi dung yeu cau hoac thu lai sau."
        ),
        key_findings=[],
        focus_metrics=[],
        recommended_issue_id=None,
        next_actions=["Kiem tra lai yeu cau", "Thu lai sau"],
        visualizations=_empty_visualization(),
        comparisons=_empty_comparison(ComparisonType.VITALS_TREND),
    )


def build_summary_fallback(
    *,
    patient_id: str,
    reason: str = "Khong the tao tom tat an toan tu du lieu hien tai.",
) -> AgentResponse:
    return AgentResponse(
        schema_version="v1",
        response_type=ResponseType.SUMMARY,
        patient_id=patient_id,
        source_id=patient_id,
        intent=ChatIntent.PATIENT_SUMMARY,
        narrative_summary=(
            "### Tom tat tam thoi\n"
            f"{reason} Bac si vui long kiem tra du lieu nguon truoc khi ra quyet dinh."
        ),
        key_findings=[],
        focus_metrics=[],
        recommended_issue_id=None,
        next_actions=["Kiem tra du lieu nguon", "Ra soat chi so moi nhat"],
        visualizations=_empty_visualization(),
        comparisons=_empty_comparison(ComparisonType.VITALS_TREND),
    )


def build_explain_alert_fallback(
    *,
    patient_id: str,
    alert_id: str,
    reason: str = "Khong the giai thich canh bao an toan tu du lieu hien tai.",
) -> AgentResponse:
    return AgentResponse(
        schema_version="v1",
        response_type=ResponseType.EXPLAIN_ALERT,
        patient_id=patient_id,
        source_id=alert_id,
        intent=ChatIntent.PATIENT_METRIC_OR_PROTOCOL,
        narrative_summary=(
            "### Giai thich canh bao tam thoi\n"
            f"{reason} Bac si can kiem tra truc tiep benh nhan va du lieu canh bao goc."
        ),
        key_findings=[],
        focus_metrics=[],
        recommended_issue_id=None,
        next_actions=["Kiem tra canh bao goc", "Danh gia truc tiep benh nhan"],
        visualizations=_empty_visualization(),
        comparisons=_empty_comparison(ComparisonType.ALERT_EVIDENCE),
    )
