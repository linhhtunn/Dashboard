import json

import pytest
from pydantic import ValidationError

from app.services.parsers.agent_response_parser import (
    LLMOutputParseError,
    parse_agent_response,
    parse_json_object,
)
from tests.test_schemas import valid_payload


def test_raw_json_object_is_parsed() -> None:
    payload = {"message": "ok"}

    assert parse_json_object(json.dumps(payload)) == payload


def test_fenced_json_object_is_parsed() -> None:
    payload = {"message": "ok"}
    raw_text = f"```json\n{json.dumps(payload)}\n```"

    assert parse_json_object(raw_text) == payload


def test_malformed_json_returns_clear_parse_error() -> None:
    with pytest.raises(LLMOutputParseError, match="Invalid JSON"):
        parse_json_object('{"message": ')


def test_multiple_raw_json_objects_are_rejected() -> None:
    with pytest.raises(LLMOutputParseError, match="Multiple JSON objects"):
        parse_json_object('{"one": 1} {"two": 2}')


def test_multiple_fenced_json_objects_are_rejected() -> None:
    raw_text = '```json\n{"one": 1}\n```\n```json\n{"two": 2}\n```'

    with pytest.raises(LLMOutputParseError, match="Multiple JSON"):
        parse_json_object(raw_text)


def test_agent_response_parser_validates_contract() -> None:
    response = parse_agent_response(json.dumps(valid_payload()))

    assert response.patient_id == "patient-123"


def test_agent_response_parser_raises_validation_error_for_invalid_contract() -> None:
    payload = valid_payload()
    payload.pop("patient_id")

    with pytest.raises(ValidationError):
        parse_agent_response(json.dumps(payload))
