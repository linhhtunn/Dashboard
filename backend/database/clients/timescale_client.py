from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator

from psycopg2.pool import SimpleConnectionPool

from database.config import DatabaseConfig, load_database_config


class TimescaleClient:
    """Connection-pool client for TigerData/TimescaleDB."""

    def __init__(self, config: DatabaseConfig | None = None) -> None:
        self._config = config or load_database_config()
        self._pool = SimpleConnectionPool(
            self._config.timescale_min_connections,
            self._config.timescale_max_connections,
            self._config.require_timescale_db_url(),
            connect_timeout=30,
            keepalives=1,
            keepalives_idle=30,
            keepalives_interval=10,
            keepalives_count=5,
        )

    @contextmanager
    def connection(self) -> Iterator[Any]:
        conn = self._pool.getconn()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self._pool.putconn(conn)

    def close(self) -> None:
        self._pool.closeall()

    def ping(self) -> bool:
        with self.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                return cur.fetchone()[0] == 1
