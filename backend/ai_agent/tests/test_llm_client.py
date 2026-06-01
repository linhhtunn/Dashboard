import pytest

from app.config import Settings
from app.llm_client import LLMConfigurationError, OpenAILLMClient


@pytest.mark.asyncio
async def test_llm_client_requires_openai_api_key() -> None:
    client = OpenAILLMClient(
        Settings(
            PORT=8005,
            OPENAI_API_KEY=None,
            OPENAI_MODEL="gpt-5.4-mini",
            LOG_LEVEL="INFO",
        )
    )

    with pytest.raises(LLMConfigurationError, match="OPENAI_API_KEY is required"):
        await client.generate_text(system_prompt="system", user_prompt="hello")
