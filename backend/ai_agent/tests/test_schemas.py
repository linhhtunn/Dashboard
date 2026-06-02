from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.schemas import AgentResponse, DataPointStatus, ResponseType, validate_agent_response


def valid_payload() -> dict:
    return {
        "schema_version": "v1",
        "response_type": "summary",
        "patient_id": "patient-123",
        "source_id": "patient-123",
        "generated_at": "2000-01-01T00:00:00Z",
        "narrative_summary": "Heart rate is elevated and should be reviewed by a clinician.",
        "visualizations": {
            "has_chart": True,
            "chart_type": "time-series",
            "chart_title": "Heart rate trend",
            "data_points": [
                {
                    "timestamp": "2026-06-01T08:00:00Z",
                    "metric": "heart_rate",
                    "value": 112,
                    "unit": "bpm",
                    "status": "WARNING",
                }
            ],
        },
        "comparisons": {
            "has_comparison": True,
            "comparison_type": "vitals-trend",
            "headers": ["Metric", "Current", "Baseline"],
            "rows": [["Heart rate", "112 bpm", "78 bpm"]],
        },
    }


def test_valid_contract_response_is_accepted() -> None:
    response = validate_agent_response(valid_payload())

    assert isinstance(response, AgentResponse)
    assert response.response_type == ResponseType.SUMMARY
    assert response.visualizations.data_points[0].status == DataPointStatus.WARNING


@pytest.mark.parametrize(
    "field",
    ["response_type", "patient_id", "source_id", "narrative_summary", "visualizations", "comparisons"],
)
def test_required_top_level_fields_are_validated(field: str) -> None:
    payload = valid_payload()
    payload.pop(field)

    with pytest.raises(ValidationError):
        validate_agent_response(payload)


def test_invalid_response_type_is_rejected() -> None:
    payload = valid_payload()
    payload["response_type"] = "diagnosis"

    with pytest.raises(ValidationError):
        validate_agent_response(payload)


def test_invalid_comparison_type_is_rejected() -> None:
    payload = valid_payload()
    payload["comparisons"]["comparison_type"] = "unsupported"

    with pytest.raises(ValidationError):
        validate_agent_response(payload)


def test_chart_requires_data_points_when_enabled() -> None:
    payload = valid_payload()
    payload["visualizations"]["data_points"] = []

    with pytest.raises(ValidationError, match="data_points must not be empty"):
        validate_agent_response(payload)


def test_chart_without_data_points_is_valid_when_disabled() -> None:
    payload = valid_payload()
    payload["visualizations"] = {
        "has_chart": False,
        "chart_type": "time-series",
        "chart_title": "",
        "data_points": [],
    }

    response = validate_agent_response(payload)

    assert response.visualizations.has_chart is False
    assert response.visualizations.data_points == []


def test_data_point_status_is_required() -> None:
    payload = valid_payload()
    payload["visualizations"]["data_points"][0].pop("status")

    with pytest.raises(ValidationError):
        validate_agent_response(payload)


def test_invalid_status_value_is_rejected() -> None:
    payload = valid_payload()
    payload["visualizations"]["data_points"][0]["status"] = "HIGH"

    with pytest.raises(ValidationError):
        validate_agent_response(payload)


def test_comparison_requires_headers_and_rows_when_enabled() -> None:
    payload = valid_payload()
    payload["comparisons"]["rows"] = []

    with pytest.raises(ValidationError, match="headers and rows must not be empty"):
        validate_agent_response(payload)


def test_comparison_without_rows_is_valid_when_disabled() -> None:
    payload = valid_payload()
    payload["comparisons"] = {
        "has_comparison": False,
        "comparison_type": "vitals-trend",
        "headers": [],
        "rows": [],
    }

    response = validate_agent_response(payload)

    assert response.comparisons.has_comparison is False
    assert response.comparisons.rows == []


def test_backend_owns_generated_at() -> None:
    response = validate_agent_response(valid_payload())

    assert response.generated_at != datetime(2000, 1, 1, tzinfo=UTC)
    assert response.generated_at.tzinfo is not None
