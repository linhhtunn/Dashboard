from dataclasses import dataclass
from typing import Protocol


class LLMConfigurationError(RuntimeError):
    """Raised when an LLM provider is missing required configuration."""


@dataclass(frozen=True)
class LLMResponse:
    content: str
    model: str
    latency_ms: float
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None


class LLMProvider(Protocol):
    async def generate_text(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
    ) -> LLMResponse:
        ...
