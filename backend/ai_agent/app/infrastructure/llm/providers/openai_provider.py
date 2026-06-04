import logging
import time

from openai import AsyncOpenAI

from app.core.config import Settings, get_settings
from app.infrastructure.llm.ports import LLMConfigurationError, LLMResponse

logger = logging.getLogger(__name__)


class OpenAIProvider:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._client: AsyncOpenAI | None = None

    @property
    def client(self) -> AsyncOpenAI:
        if not self.settings.openai_api_key:
            raise LLMConfigurationError("OPENAI_API_KEY is required before calling the LLM.")
        if self._client is None:
            self._client = AsyncOpenAI(api_key=self.settings.openai_api_key)
        return self._client

    async def generate_text(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
    ) -> LLMResponse:
        started_at = time.perf_counter()
        response = await self.client.chat.completions.create(
            model=self.settings.openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
        )
        latency_ms = (time.perf_counter() - started_at) * 1000
        usage = response.usage
        message = response.choices[0].message
        content = message.content or ""

        result = LLMResponse(
            content=content,
            model=self.settings.openai_model,
            latency_ms=latency_ms,
            prompt_tokens=getattr(usage, "prompt_tokens", None) if usage else None,
            completion_tokens=getattr(usage, "completion_tokens", None) if usage else None,
            total_tokens=getattr(usage, "total_tokens", None) if usage else None,
        )

        logger.info(
            "llm_call_completed provider=openai model=%s latency_ms=%.2f prompt_tokens=%s completion_tokens=%s total_tokens=%s",
            result.model,
            result.latency_ms,
            result.prompt_tokens,
            result.completion_tokens,
            result.total_tokens,
        )
        return result
