from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    rabbitmq_url: str
    queue_name: str = "caresignal.vitals.v1"
    dlq_name: str = "caresignal.vitals.dlq"
    prefetch_count: int = 200

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
