from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg.rows import dict_row

logger = logging.getLogger(__name__)


class PostgresConnector:
    def __init__(self, database_url: str) -> None:
        self._database_url = database_url

    @contextmanager
    def connection(self) -> Iterator[psycopg.Connection[dict]]:
        logger.debug("Opening new database connection")
        conn = psycopg.connect(self._database_url, row_factory=dict_row)
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
            logger.debug("Database connection closed")
