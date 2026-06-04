import pytest

from app.config import Settings
from app.llm_client import OpenAILLMClient
from app.infrastructure.llm.ports import LLMConfigurationError
from app.infrastructure.llm.providers import OpenAIProvider


@pytest.mark.asyncio
async def test_llm_client_requires_openai_api_key() -> None:
    client = OpenAIProvider(
        Settings(
            PORT=8005,
            OPENAI_API_KEY=None,
            OPENAI_MODEL="gpt-5.4-mini",
            LOG_LEVEL="INFO",
        )
    )

    with pytest.raises(LLMConfigurationError, match="OPENAI_API_KEY is required"):
        await client.generate_text(system_prompt="system", user_prompt="hello")


def test_legacy_openai_llm_client_alias_points_to_openai_provider() -> None:
    assert OpenAILLMClient is OpenAIProvider
