import pytest

from app.infrastructure.llm.ports import LLMConfigurationError
from app.retry import run_with_llm_retry, run_with_repair_retry
from app.services.parsers.agent_response_parser import LLMOutputParseError


@pytest.mark.asyncio
async def test_retryable_llm_error_retries_and_succeeds() -> None:
    attempts = 0

    async def operation() -> str:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise TimeoutError("temporary timeout")
        return "ok"

    result = await run_with_llm_retry(operation, max_attempts=2)

    assert result == "ok"
    assert attempts == 2


@pytest.mark.asyncio
async def test_missing_configuration_error_does_not_retry() -> None:
    attempts = 0

    async def operation() -> str:
        nonlocal attempts
        attempts += 1
        raise LLMConfigurationError("OPENAI_API_KEY is required")

    with pytest.raises(LLMConfigurationError):
        await run_with_llm_retry(operation, max_attempts=3)

    assert attempts == 1


@pytest.mark.asyncio
async def test_repair_retry_succeeds_after_parse_error() -> None:
    attempts = 0

    async def operation(attempt: int, last_error: Exception | None) -> str:
        nonlocal attempts
        attempts += 1
        assert attempt == attempts
        if attempts == 1:
            raise LLMOutputParseError("bad json")
        assert last_error is not None
        return "repaired"

    result = await run_with_repair_retry(
        operation,
        fallback=lambda exc: "fallback",
        max_attempts=2,
    )

    assert result == "repaired"
    assert attempts == 2


@pytest.mark.asyncio
async def test_repair_retry_routes_exhaustion_to_fallback() -> None:
    attempts = 0

    async def operation(attempt: int, last_error: Exception | None) -> str:
        nonlocal attempts
        attempts += 1
        raise LLMOutputParseError("still bad")

    result = await run_with_repair_retry(
        operation,
        fallback=lambda exc: "typed fallback",
        max_attempts=2,
    )

    assert result == "typed fallback"
    assert attempts == 2
