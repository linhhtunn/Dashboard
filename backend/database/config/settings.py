from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote, urlsplit, urlunsplit

from dotenv import load_dotenv


_DATABASE_DIR = Path(__file__).resolve().parents[1]
_BACKEND_DIR = _DATABASE_DIR.parent
_REPO_ROOT = _BACKEND_DIR.parent


@dataclass(frozen=True)
class DatabaseConfig:
    supabase_url: str | None
    supabase_anon_key: str | None
    supabase_service_role_key: str | None
    supabase_db_url: str | None
    timescale_db_url: str | None
    timescale_db_password: str | None
    rabbitmq_url: str | None
    timescale_min_connections: int = 1
    timescale_max_connections: int = 5
    timescale_batch_size: int = 500
    benchmark_results_dir: Path = _DATABASE_DIR / "benchmarks" / "results"

    def require_supabase_db_url(self) -> str:
        if not self.supabase_db_url:
            raise RuntimeError("SUPABASE_DB_URL is required for Supabase DB operations")
        return self.supabase_db_url

    def require_timescale_db_url(self) -> str:
        if not self.timescale_db_url:
            raise RuntimeError("TIMESCALE_DB_URL is required for TigerData/TimescaleDB operations")
        return _with_password(self.timescale_db_url, self.timescale_db_password)


def _load_env_files() -> None:
    load_dotenv(_BACKEND_DIR / ".env", override=False)
    load_dotenv(_DATABASE_DIR / "config" / ".env", override=False)


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    return int(raw)


def _with_password(url: str, password: str | None) -> str:
    parsed = urlsplit(url)
    if parsed.password or not password or not parsed.username or not parsed.hostname:
        return url

    username = quote(parsed.username, safe="")
    encoded_password = quote(password, safe="")
    host = parsed.hostname
    if ":" in host and not host.startswith("["):
        host = f"[{host}]"
    if parsed.port is not None:
        host = f"{host}:{parsed.port}"
    netloc = f"{username}:{encoded_password}@{host}"
    return urlunsplit((parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment))


def load_database_config() -> DatabaseConfig:
    _load_env_files()
    return DatabaseConfig(
        supabase_url=os.getenv("SUPABASE_URL"),
        supabase_anon_key=os.getenv("SUPABASE_ANON_KEY"),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        supabase_db_url=os.getenv("SUPABASE_DB_URL"),
        timescale_db_url=os.getenv("TIMESCALE_DB_URL"),
        timescale_db_password=os.getenv("TIMESCALE_DB_PASSWORD"),
        rabbitmq_url=os.getenv("RABBITMQ_URL"),
        timescale_min_connections=_int_env("TIMESCALE_MIN_CONNECTIONS", 1),
        timescale_max_connections=_int_env("TIMESCALE_MAX_CONNECTIONS", 5),
        timescale_batch_size=_int_env("TIMESCALE_BATCH_SIZE", 500),
        benchmark_results_dir=Path(
            os.getenv(
                "DATABASE_BENCHMARK_RESULTS_DIR",
                str(_DATABASE_DIR / "benchmarks" / "results"),
            )
        ),
    )
