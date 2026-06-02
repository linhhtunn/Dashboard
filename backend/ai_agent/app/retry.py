import asyncio
from collections.abc import Awaitable, Callable
from typing import TypeVar

from pydantic import ValidationError
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from app.llm_client import LLMConfigurationError
from app.output_parser import LLMOutputParseError

T = TypeVar("T")


class RetryAttemptsExhausted(RuntimeError):
    """Raised when bounded retries are exhausted and the caller should fallback."""


def is_retryable_llm_error(exc: BaseException) -> bool:
    if isinstance(exc, LLMConfigurationError):
        return False
    if isinstance(exc, (TimeoutError, ConnectionError, asyncio.TimeoutError)):
        return True
    name = exc.__class__.__name__.lower()
    return any(marker in name for marker in ("ratelimit", "timeout", "apiconnection", "serviceunavailable"))


async def run_with_llm_retry(
    operation: Callable[[], Awaitable[T]],
    *,
    max_attempts: int = 3,
) -> T:
    @retry(
        retry=retry_if_exception(is_retryable_llm_error),
        wait=wait_exponential(multiplier=0.1, min=0.1, max=1.0),
        stop=stop_after_attempt(max_attempts),
        reraise=True,
    )
    async def _run() -> T:
        return await operation()

    return await _run()


async def run_with_repair_retry(
    operation: Callable[[int, Exception | None], Awaitable[T]],
    *,
    fallback: Callable[[Exception], T],
    max_attempts: int = 2,
) -> T:
    last_error: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            return await operation(attempt, last_error)
        except (LLMOutputParseError, ValidationError) as exc:
            last_error = exc
    if last_error is None:
        raise RetryAttemptsExhausted("Repair retry failed without an error")
    return fallback(last_error)
