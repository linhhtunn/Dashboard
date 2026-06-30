from functools import lru_cache
import os
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the AI Agent service."""

    port: int = Field(default=8005, alias="PORT")
    app_environment: Literal["development", "staging", "production"] = Field(
        default="development", alias="APP_ENVIRONMENT"
    )
    ai_mode: Literal["off", "summary", "cdss"] = Field(default="cdss", alias="AI_MODE")
    alert_dispatch_mode: Literal["shadow", "live"] = Field(
        default="shadow", alias="ALERT_DISPATCH_MODE"
    )
    phi_processing_approved: bool = Field(default=False, alias="PHI_PROCESSING_APPROVED")
    prompt_version: str = Field(default="unversioned", alias="PROMPT_VERSION")
    rule_version: str = Field(default="unversioned", alias="RULE_VERSION")
    supabase_url: str | None = Field(default=None, alias="SUPABASE_URL")
    supabase_service_key: str | None = Field(default=None, alias="SUPABASE_SERVICE_KEY")
    supabase_jwt_secret: str | None = Field(default=None, alias="SUPABASE_JWT_SECRET")
    supabase_jwks_url: str | None = Field(default=None, alias="SUPABASE_JWKS_URL")
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")
    exa_api_key: str | None = Field(default=None, alias="EXA_API_KEY")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    memory_checkpointer: str = Field(default="memory", alias="MEMORY_CHECKPOINTER")
    memory_store: str = Field(default="memory", alias="MEMORY_STORE")
    memory_postgres_dsn: str | None = Field(default=None, alias="MEMORY_POSTGRES_DSN")
    supabase_db_url: str | None = Field(default=None, alias="SUPABASE_DB_URL")
    timescale_db_url: str | None = Field(default=None, alias="TIMESCALE_DB_URL")
    timescale_host: str | None = Field(default=None, alias="TIMESCALE_HOST")
    timescale_port: int = Field(default=5432, alias="TIMESCALE_PORT")
    timescale_db: str | None = Field(default=None, alias="TIMESCALE_DB")
    timescale_user: str | None = Field(default=None, alias="TIMESCALE_USER")
    timescale_password: str | None = Field(default=None, alias="TIMESCALE_PASSWORD")
    max_message_length: int = Field(default=2000, alias="MAX_MESSAGE_LENGTH")
    conversation_ttl_minutes: int = Field(default=60, alias="CONVERSATION_TTL_MINUTES")
    vitals_query_limit: int = Field(default=1000, alias="VITALS_QUERY_LIMIT")
    baseline_days: int = Field(default=7, alias="BASELINE_DAYS")
    allowed_origins: str = Field(
        default="https://caresignal.vercel.app,http://localhost:3000",
        alias="ALLOWED_ORIGINS",
    )
    memory_compact_turn_threshold: int = Field(default=6, alias="MEMORY_COMPACT_TURN_THRESHOLD")
    memory_overlap_turns: int = Field(default=2, alias="MEMORY_OVERLAP_TURNS")
    sqlite_db_path: str | None = Field(default=None, alias="SQLITE_DB_PATH")
    intent_classifier_use_llm: bool = Field(default=False, alias="INTENT_CLASSIFIER_USE_LLM")
    langfuse_enabled: bool = Field(default=False, alias="LANGFUSE_ENABLED")
    langfuse_public_key: str | None = Field(default=None, alias="LANGFUSE_PUBLIC_KEY")
    langfuse_secret_key: str | None = Field(default=None, alias="LANGFUSE_SECRET_KEY")
    langfuse_host: str = Field(default="https://cloud.langfuse.com", alias="LANGFUSE_HOST")
    langfuse_base_url: str | None = Field(default=None, alias="LANGFUSE_BASE_URL")
    langfuse_capture_content: bool = Field(default=False, alias="LANGFUSE_CAPTURE_CONTENT")
    langfuse_patient_id_mode: str = Field(default="hash", alias="LANGFUSE_PATIENT_ID_MODE")
    langfuse_hash_salt: str | None = Field(default=None, alias="LANGFUSE_HASH_SALT")

    @model_validator(mode="after")
    def validate_production_safety(self) -> "Settings":
        if self.app_environment != "production":
            return self

        if not os.getenv("AI_MODE"):
            raise ValueError("AI_MODE must be explicitly configured in production")

        required = {
            "SUPABASE_URL": self.supabase_url,
            "SUPABASE_SERVICE_KEY": self.supabase_service_key,
            "SUPABASE_JWKS_URL or SUPABASE_JWT_SECRET": (
                self.supabase_jwks_url or self.supabase_jwt_secret
            ),
            "TIMESCALE_DB_URL": self.resolved_timescale_dsn,
        }
        missing = [name for name, value in required.items() if not value]
        if missing:
            raise ValueError(f"Missing production configuration: {', '.join(missing)}")
        if self.ai_mode != "off" and not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required when AI_MODE is enabled")
        if self.alert_dispatch_mode == "live" and not self.phi_processing_approved:
            raise ValueError("Live alert dispatch requires PHI_PROCESSING_APPROVED=true")
        if self.langfuse_capture_content:
            raise ValueError("LANGFUSE_CAPTURE_CONTENT must be false in production")
        if self.langfuse_patient_id_mode == "raw":
            raise ValueError("Raw patient identifiers cannot be exported in production")
        return self

    @property
    def resolved_memory_postgres_dsn(self) -> str | None:
        return self.memory_postgres_dsn or self.supabase_db_url

    @property
    def resolved_timescale_dsn(self) -> str | None:
        if self.timescale_db_url:
            return self.timescale_db_url
        if not all([self.timescale_host, self.timescale_db, self.timescale_user, self.timescale_password]):
            return None
        return (
            f"postgresql://{self.timescale_user}:{self.timescale_password}"
            f"@{self.timescale_host}:{self.timescale_port}/{self.timescale_db}"
        )

    @property
    def resolved_supabase_jwks_url(self) -> str | None:
        if self.supabase_jwks_url:
            return self.supabase_jwks_url
        if not self.supabase_url:
            return None
        return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"

    @property
    def allowed_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def resolved_langfuse_base_url(self) -> str:
        return self.langfuse_base_url or self.langfuse_host

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
