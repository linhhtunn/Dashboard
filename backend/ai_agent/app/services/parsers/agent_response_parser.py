import json
import re
from typing import Any

from pydantic import ValidationError

from app.contracts.agent_response import AgentResponse, validate_agent_response


from datetime import datetime, UTC

class LLMOutputParseError(ValueError):
    """Raised when raw LLM text cannot be parsed as one Contract 6 JSON object."""


FENCED_JSON_PATTERN = re.compile(r"```(?:json)?\s*(.*?)```", re.IGNORECASE | re.DOTALL)


def _parse_single_json_object(raw: str) -> dict[str, Any]:
    decoder = json.JSONDecoder()
    try:
        parsed, end = decoder.raw_decode(raw)
    except json.JSONDecodeError as exc:
        raise LLMOutputParseError(f"Invalid JSON: {exc.msg}") from exc

    if not isinstance(parsed, dict):
        raise LLMOutputParseError("Expected a JSON object")

    trailing = raw[end:].strip()
    if trailing:
        try:
            decoder.raw_decode(trailing)
        except json.JSONDecodeError:
            raise LLMOutputParseError("Unexpected text after JSON object") from None
        raise LLMOutputParseError("Multiple JSON objects are ambiguous")

    return parsed


def parse_json_object(raw_text: str) -> dict[str, Any]:
    text = raw_text.strip()
    if not text:
        raise LLMOutputParseError("LLM output is empty")

    fenced_blocks = FENCED_JSON_PATTERN.findall(text)
    if len(fenced_blocks) > 1:
        raise LLMOutputParseError("Multiple JSON code fences are ambiguous")
    if len(fenced_blocks) == 1:
        return _parse_single_json_object(fenced_blocks[0].strip())

    if not text.startswith("{"):
        raise LLMOutputParseError("Expected raw JSON object or fenced JSON object")
    return _parse_single_json_object(text)


def normalize_and_repair_payload(payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return payload

    if payload.get("patient_id") is None:
        payload["patient_id"] = None
    elif "patient_id" in payload:
        payload["patient_id"] = str(payload["patient_id"])
    else:
        payload["patient_id"] = None

    if "narrative_summary" not in payload or not payload["narrative_summary"]:
        payload["narrative_summary"] = "No narrative summary provided."

    # Visualizations
    vis = payload.get("visualizations")
    if not isinstance(vis, dict):
        vis = {}
        payload["visualizations"] = vis
    
    if "has_chart" not in vis:
        vis["has_chart"] = False
    vis["has_chart"] = bool(vis["has_chart"])
    
    if "chart_type" not in vis or not vis["chart_type"]:
        vis["chart_type"] = "time-series"
    if "chart_title" not in vis:
        vis["chart_title"] = ""
        
    pts = vis.get("data_points")
    if not isinstance(pts, list):
        pts = []
    
    clean_pts = []
    for pt in pts:
        if isinstance(pt, dict):
            if "timestamp" not in pt or not pt["timestamp"]:
                pt["timestamp"] = datetime.now(UTC).isoformat()
            
            if "metric" not in pt or not pt["metric"]:
                pt["metric"] = "unknown"
            
            val = pt.get("value")
            try:
                pt["value"] = float(val)
            except (ValueError, TypeError):
                pt["value"] = 0.0
                
            if "unit" not in pt or not pt["unit"]:
                pt["unit"] = "units"
                
            status = str(pt.get("status", "NORMAL")).upper()
            if status not in ["NORMAL", "WARNING", "ABNORMAL", "CRITICAL"]:
                status = "NORMAL"
            pt["status"] = status
            
            clean_pts.append(pt)
            
    vis["data_points"] = clean_pts
    
    if vis["has_chart"] and not clean_pts:
        vis["has_chart"] = False
    elif not vis["has_chart"]:
        vis["data_points"] = []

    # Comparisons
    comp = payload.get("comparisons")
    if not isinstance(comp, dict):
        comp = {}
        payload["comparisons"] = comp
        
    if "has_comparison" not in comp:
        comp["has_comparison"] = False
    comp["has_comparison"] = bool(comp["has_comparison"])
    
    comp_type = str(comp.get("comparison_type", "vitals-trend"))
    if comp_type not in ["vitals-vs-activity", "alert-evidence", "vitals-trend"]:
        comp_type = "vitals-trend"
    comp["comparison_type"] = comp_type
    
    headers = comp.get("headers")
    if not isinstance(headers, list):
        headers = []
    comp["headers"] = [str(h) for h in headers if str(h).strip()]
    
    rows = comp.get("rows")
    if not isinstance(rows, list):
        rows = []
    clean_rows = []
    for r in rows:
        if isinstance(r, list):
            clean_rows.append([str(cell) for cell in r])
    comp["rows"] = clean_rows
    
    if comp["has_comparison"] and (not comp["headers"] or not clean_rows):
        comp["has_comparison"] = False
    
    if not comp["has_comparison"]:
        comp["rows"] = []

    actions = payload.get("actions")
    if not isinstance(actions, list):
        payload["actions"] = []
    else:
        clean_actions = []
        for action in actions:
            if not isinstance(action, dict):
                continue
            action_type = str(action.get("type") or "").strip()
            label = str(action.get("label") or "").strip()
            if not action_type or not label:
                continue
            clean_actions.append(
                {
                    "type": action_type,
                    "label": label,
                    "patient_id": _optional_str(action.get("patient_id")),
                    "hospital_patient_code": _optional_str(action.get("hospital_patient_code")),
                    "display_name": _optional_str(action.get("display_name")),
                    "href": _optional_str(action.get("href")),
                    "metadata": action.get("metadata") if isinstance(action.get("metadata"), dict) else {},
                }
            )
        payload["actions"] = clean_actions

    return payload


def _optional_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def parse_agent_response(raw_text: str) -> AgentResponse:
    payload = parse_json_object(raw_text)
    payload = normalize_and_repair_payload(payload)
    try:
        return validate_agent_response(payload)
    except ValidationError:
        raise
