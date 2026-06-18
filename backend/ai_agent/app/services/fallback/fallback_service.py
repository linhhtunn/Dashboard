from app.contracts.agent_response import (
    AgentResponse,
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
    patient_id: str | None,
    conversation_id: str | None = None,
    reason: str = "Yeu cau khong the xu ly an toan trong luc nay.",
) -> AgentResponse:
    source_id = conversation_id or patient_id or "DOCTOR_SCOPE"
    return AgentResponse(
        schema_version="v1",
        response_type=ResponseType.CHAT,
        patient_id=patient_id,
        source_id=source_id,
        narrative_summary=(
            "### Phan hoi an toan\n"
            f"{reason} Vui long kiem tra lai noi dung yeu cau hoac thu lai sau."
        ),
        visualizations=_empty_visualization(),
        comparisons=_empty_comparison(ComparisonType.VITALS_TREND),
    )
