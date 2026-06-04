from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the AI Agent service."""

    port: int = Field(default=8005, alias="PORT")
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-5.4-mini", alias="OPENAI_MODEL")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    memory_checkpointer: str = Field(default="memory", alias="MEMORY_CHECKPOINTER")
    memory_postgres_dsn: str | None = Field(default=None, alias="MEMORY_POSTGRES_DSN")
    supabase_db_url: str | None = Field(default=None, alias="SUPABASE_DB_URL")
    memory_compact_turn_threshold: int = Field(default=6, alias="MEMORY_COMPACT_TURN_THRESHOLD")
    memory_overlap_turns: int = Field(default=2, alias="MEMORY_OVERLAP_TURNS")

    @property
    def resolved_memory_postgres_dsn(self) -> str | None:
        return self.memory_postgres_dsn or self.supabase_db_url

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
