from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator

import psycopg2
from psycopg2.extras import RealDictCursor

from database.config import DatabaseConfig, load_database_config


class SupabaseDbClient:
    """Server-side Postgres client for the Supabase app database."""

    def __init__(self, config: DatabaseConfig | None = None) -> None:
        self._config = config or load_database_config()

    @contextmanager
    def connection(self) -> Iterator[Any]:
        conn = psycopg2.connect(self._config.require_supabase_db_url())
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def ping(self) -> bool:
        with self.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                return cur.fetchone()[0] == 1

    def fetch_all(self, sql: str, params: tuple[Any, ...] | None = None) -> list[dict[str, Any]]:
        with self.connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(sql, params or ())
                return [dict(row) for row in cur.fetchall()]
