import json
import re
from typing import Any

from pydantic import ValidationError

from app.schemas import AgentResponse, validate_agent_response


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


def parse_agent_response(raw_text: str) -> AgentResponse:
    payload = parse_json_object(raw_text)
    try:
        return validate_agent_response(payload)
    except ValidationError:
        raise
