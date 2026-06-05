from __future__ import annotations

import logging
from dataclasses import dataclass
from inspect import isawaitable
from typing import Any

from app.core.config import Settings

logger = logging.getLogger(__name__)


class StoreConfigurationError(RuntimeError):
    """Raised when requested persisted store cannot be configured."""


@dataclass
class StoreHandle:
    store: Any | None
    context_manager: Any | None = None

    def close(self) -> None:
        if self.context_manager is None:
            return
        if hasattr(self.context_manager, "__exit__"):
            self.context_manager.__exit__(None, None, None)
            return
        if hasattr(self.context_manager, "close"):
            self.context_manager.close()

    async def aclose(self) -> None:
        if self.context_manager is None:
            return
        if hasattr(self.context_manager, "__aexit__"):
            result = self.context_manager.__aexit__(None, None, None)
            if isawaitable(result):
                await result
            return
        if hasattr(self.context_manager, "close"):
            result = self.context_manager.close()
            if isawaitable(result):
                await result
        else:
            self.close()


def create_store(settings: Settings) -> StoreHandle:
    mode = settings.memory_store.strip().lower()
    logger.info("chat_memory_store_requested mode=%s", mode or "memory")
    if mode in {"", "memory", "in-memory", "in_memory", "inmemory", "local", "test"}:
        return _create_in_memory_store()
    if mode in {"supabase", "postgres", "postgresql"}:
        return _create_postgres_store(settings)
    raise StoreConfigurationError(f"Unsupported MEMORY_STORE value: {settings.memory_store}")


async def create_async_store(settings: Settings) -> StoreHandle:
    mode = settings.memory_store.strip().lower()
    logger.info("chat_memory_store_requested mode=%s", mode or "memory")
    if mode in {"", "memory", "in-memory", "in_memory", "inmemory", "local", "test"}:
        return _create_in_memory_store()
    if mode in {"supabase", "postgres", "postgresql"}:
        return await _create_async_postgres_store(settings)
    raise StoreConfigurationError(f"Unsupported MEMORY_STORE value: {settings.memory_store}")


def _create_in_memory_store() -> StoreHandle:
    try:
        from langgraph.store.memory import InMemoryStore
    except ImportError:
        logger.info("langgraph_not_installed_for_local_store using_in_memory_fallback=true")
        return StoreHandle(store=None)
    logger.info("chat_memory_store_selected mode=memory backend=langgraph_in_memory")
    return StoreHandle(store=InMemoryStore())


def _create_postgres_store(settings: Settings) -> StoreHandle:
    dsn = settings.resolved_memory_postgres_dsn
    if not dsn:
        raise StoreConfigurationError(
            "MEMORY_POSTGRES_DSN or SUPABASE_DB_URL is required when MEMORY_STORE=supabase"
        )

    try:
        from langgraph.store.postgres import PostgresStore
        from psycopg.rows import dict_row
        from psycopg_pool import ConnectionPool
    except ImportError as exc:
        raise StoreConfigurationError(
            "langgraph store postgres is required for Supabase/Postgres store"
        ) from exc

    pool = ConnectionPool(
        conninfo=dsn,
        kwargs={"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row},
        min_size=1,
        max_size=4,
        open=False,
        check=ConnectionPool.check_connection,
    )
    pool.open(wait=True)
    store = PostgresStore(pool)
    logger.info("chat_memory_store_selected mode=supabase backend=postgres")
    return StoreHandle(store=store, context_manager=pool)


async def _create_async_postgres_store(settings: Settings) -> StoreHandle:
    dsn = settings.resolved_memory_postgres_dsn
    if not dsn:
        raise StoreConfigurationError(
            "MEMORY_POSTGRES_DSN or SUPABASE_DB_URL is required when MEMORY_STORE=supabase"
        )

    try:
        from langgraph.store.postgres import AsyncPostgresStore
        from psycopg.rows import dict_row
        from psycopg_pool import AsyncConnectionPool
    except ImportError as exc:
        raise StoreConfigurationError(
            "langgraph store postgres is required for Supabase/Postgres store"
        ) from exc

    pool = AsyncConnectionPool(
        conninfo=dsn,
        kwargs={"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row},
        min_size=1,
        max_size=4,
        open=False,
        check=AsyncConnectionPool.check_connection,
    )
    await pool.open(wait=True)
    store = AsyncPostgresStore(pool)
    logger.info("chat_memory_store_selected mode=supabase backend=async_postgres")
    return StoreHandle(store=store, context_manager=pool)
