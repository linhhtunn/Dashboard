"""PostgreSQL connector for raw_vitals and clean_vitals tables."""

from __future__ import annotations

import logging
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator

import psycopg2
from psycopg2.extras import Json, RealDictCursor

from ingestion.cleaner import CleanVitalRecord, DataState
from settings import DatabaseSettings, load_database_settings

logger = logging.getLogger(__name__)


def _to_db_timestamp(value: Any) -> datetime:
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, str):
        normalized = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(normalized)
    else:
        raise ValueError(f"Unsupported timestamp value: {value!r}")

    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc)
    return dt.replace(tzinfo=None)


def _enrich_raw_payload(
    raw_payload: dict[str, Any],
    record: CleanVitalRecord,
    *,
    metadata_key: str,
) -> dict[str, Any]:
    enriched = dict(raw_payload)
    enriched[metadata_key] = {
        "data_state": record.data_state.value,
        "validation_notes": record.validation_notes,
        "scenario_id": record.scenario_id,
        "message_id": record.message_id,
    }
    return enriched


class DatabaseConnector:
    def __init__(
        self,
        database_url: str,
        db_settings: DatabaseSettings | None = None,
    ) -> None:
        self._database_url = database_url
        self._db = db_settings or load_database_settings()

    @contextmanager
    def connection(self) -> Iterator[Any]:
        conn = psycopg2.connect(
            self._database_url,
            connect_timeout=self._db.connect_timeout_seconds,
        )
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def verify_ingestion_tables(self) -> list[str]:
        with self.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = %s
                      AND table_name = ANY(%s)
                    """,
                    (self._db.schema_name, list(self._db.required_tables)),
                )
                found = {row[0] for row in cur.fetchall()}
        return [t for t in self._db.required_tables if t not in found]

    def message_exists(self, message_id: str) -> bool:
        if not message_id:
            return False
        with self.connection() as conn:
            return self._message_exists(conn, message_id)

    def _message_exists(self, conn: Any, message_id: str) -> bool:
        table = self._db.raw_vitals_table
        col = self._db.message_id_column
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT 1 FROM {table} WHERE {col} = %s LIMIT 1",
                (message_id,),
            )
            return cur.fetchone() is not None

    def _patient_exists(self, conn: Any, patient_id: str) -> bool:
        table = self._db.patients_table
        col = self._db.patient_id_column
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT 1 FROM {table} WHERE {col} = %s LIMIT 1",
                (patient_id,),
            )
            return cur.fetchone() is not None

    def _insert_raw_vital(
        self,
        conn: Any,
        *,
        patient_id: str,
        message_id: str | None,
        timestamp: datetime,
        raw_payload: dict[str, Any],
    ) -> None:
        table = self._db.raw_vitals_table
        pid_col = self._db.patient_id_column
        mid_col = self._db.message_id_column
        ts_col = self._db.timestamp_column
        payload_col = self._db.raw_payload_column

        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO {table} ({pid_col}, {mid_col}, {ts_col}, {payload_col})
                VALUES (%s, %s, %s, %s)
                """,
                (patient_id, message_id, timestamp, Json(raw_payload)),
            )

    def _insert_clean_vital(self, conn: Any, record: CleanVitalRecord) -> None:
        try:
            timestamp = _to_db_timestamp(record.timestamp)
        except ValueError:
            logger.warning(
                "Skip clean_vitals insert for message_id=%s: invalid timestamp",
                record.message_id,
            )
            return

        pid_col = self._db.patient_id_column
        ts_col = self._db.timestamp_column
        columns = [pid_col, ts_col]
        values: list[Any] = [record.patient_id, timestamp]

        for name in self._db.clean_vital_insert_columns:
            value = getattr(record, name, None)
            if value is not None:
                columns.append(name)
                values.append(value)

        placeholders = ", ".join(["%s"] * len(columns))
        col_sql = ", ".join(columns)
        table = self._db.clean_vitals_table

        with conn.cursor() as cur:
            cur.execute(
                f"INSERT INTO {table} ({col_sql}) VALUES ({placeholders})",
                values,
            )

    def process_message(self, raw_payload: dict[str, Any], record: CleanVitalRecord) -> None:
        with self.connection() as conn:
            if self._message_exists(conn, record.message_id):
                logger.debug("Duplicate message_id=%s — skipped", record.message_id)
                return

            if not self._patient_exists(conn, record.patient_id):
                logger.warning(
                    "Unknown patient_id=%s for message_id=%s — skipped",
                    record.patient_id,
                    record.message_id,
                )
                return

            try:
                timestamp = _to_db_timestamp(record.timestamp)
            except ValueError:
                timestamp = datetime.now(timezone.utc).replace(tzinfo=None)

            payload = _enrich_raw_payload(
                raw_payload,
                record,
                metadata_key=self._db.raw_payload_metadata_key,
            )
            self._insert_raw_vital(
                conn,
                patient_id=record.patient_id,
                message_id=record.message_id,
                timestamp=timestamp,
                raw_payload=payload,
            )

            if record.data_state == DataState.VALID:
                self._insert_clean_vital(conn, record)

    def count_rows(self) -> dict[str, int]:
        with self.connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                counts: dict[str, int] = {}
                for table in self._db.count_tables:
                    cur.execute(f"SELECT COUNT(*) AS n FROM {table}")
                    counts[table] = int(cur.fetchone()["n"])
                return counts

    def ping(self) -> bool:
        with self.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                return cur.fetchone()[0] == 1
