from __future__ import annotations

import logging
from dataclasses import dataclass
from inspect import isawaitable
from typing import Any

from app.core.config import Settings

logger = logging.getLogger(__name__)


class MemoryConfigurationError(RuntimeError):
    """Raised when requested persisted memory cannot be configured."""


@dataclass
class CheckpointerHandle:
    checkpointer: Any | None
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


def create_checkpointer(settings: Settings) -> CheckpointerHandle:
    mode = settings.memory_checkpointer.strip().lower()
    logger.info("chat_memory_checkpointer_requested mode=%s", mode or "memory")
    if mode in {"", "memory", "in-memory", "inmemory", "local", "test"}:
        return _create_in_memory_checkpointer()
    if mode in {"supabase", "postgres", "postgresql"}:
        return _create_postgres_checkpointer(settings)
    raise MemoryConfigurationError(f"Unsupported MEMORY_CHECKPOINTER value: {settings.memory_checkpointer}")


async def create_async_checkpointer(settings: Settings) -> CheckpointerHandle:
    mode = settings.memory_checkpointer.strip().lower()
    logger.info("chat_memory_checkpointer_requested mode=%s", mode or "memory")
    if mode in {"", "memory", "in-memory", "inmemory", "local", "test"}:
        return _create_in_memory_checkpointer()
    if mode in {"supabase", "postgres", "postgresql"}:
        return await _create_async_postgres_checkpointer(settings)
    raise MemoryConfigurationError(f"Unsupported MEMORY_CHECKPOINTER value: {settings.memory_checkpointer}")


def _create_in_memory_checkpointer() -> CheckpointerHandle:
    try:
        try:
            from langgraph.checkpoint.memory import InMemorySaver
        except ImportError:
            from langgraph.checkpoint.memory import MemorySaver as InMemorySaver
    except ImportError:
        logger.info("langgraph_not_installed_for_local_memory using_manual_memory_workflow=true")
        return CheckpointerHandle(checkpointer=None)
    logger.info("chat_memory_checkpointer_selected mode=memory backend=langgraph_in_memory")
    return CheckpointerHandle(checkpointer=InMemorySaver())


def _create_postgres_checkpointer(settings: Settings) -> CheckpointerHandle:
    dsn = settings.resolved_memory_postgres_dsn
    if not dsn:
        raise MemoryConfigurationError(
            "MEMORY_POSTGRES_DSN or SUPABASE_DB_URL is required when MEMORY_CHECKPOINTER=supabase"
        )

    try:
        from langgraph.checkpoint.postgres import PostgresSaver
        from psycopg.rows import dict_row
        from psycopg_pool import ConnectionPool
    except ImportError as exc:
        raise MemoryConfigurationError(
            "langgraph-checkpoint-postgres is required for Supabase/Postgres memory"
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
    checkpointer = PostgresSaver(pool)
    logger.info("chat_memory_checkpointer_selected mode=supabase backend=postgres")
    return CheckpointerHandle(checkpointer=checkpointer, context_manager=pool)


async def _create_async_postgres_checkpointer(settings: Settings) -> CheckpointerHandle:
    dsn = settings.resolved_memory_postgres_dsn
    if not dsn:
        raise MemoryConfigurationError(
            "MEMORY_POSTGRES_DSN or SUPABASE_DB_URL is required when MEMORY_CHECKPOINTER=supabase"
        )

    try:
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
        from psycopg.rows import dict_row
        from psycopg_pool import AsyncConnectionPool
    except ImportError as exc:
        raise MemoryConfigurationError(
            "langgraph-checkpoint-postgres is required for Supabase/Postgres memory"
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
    checkpointer = AsyncPostgresSaver(pool)
    logger.info("chat_memory_checkpointer_selected mode=supabase backend=async_postgres")
    return CheckpointerHandle(checkpointer=checkpointer, context_manager=pool)
