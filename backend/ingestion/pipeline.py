"""E2E ingestion pipeline: RabbitMQ → clean → Supabase."""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from dotenv import load_dotenv

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from ingestion.cleaner import VitalCleaner
from ingestion.consumer import VitalConsumer
from ingestion.db_connector import DatabaseConnector
from settings import (
    load_database_url,
    load_ingestion_settings,
    load_rabbitmq_url,
    resolve_backend_path,
)


def _configure_logging(settings) -> None:
    level = getattr(logging, settings.pipeline.log_level.upper(), logging.INFO)
    logging.basicConfig(level=level, format=settings.pipeline.log_format)


logger = logging.getLogger("ingestion.pipeline")


class IngestionPipeline:
    def __init__(self) -> None:
        load_dotenv(_BACKEND / ".env", override=False)
        self._ingestion = load_ingestion_settings()
        _configure_logging(self._ingestion)
        self._cleaner = VitalCleaner(self._ingestion.validation)
        self._db = DatabaseConnector(
            load_database_url(),
            db_settings=self._ingestion.database,
        )

    def ensure_ready(self) -> None:
        if not self._db.ping():
            raise RuntimeError("Database ping failed — check DATABASE_URL in backend/.env")
        missing = self._db.verify_ingestion_tables()
        if missing:
            raise RuntimeError(
                f"Missing tables: {', '.join(missing)}. Create schema on Supabase before ingestion."
            )
        tables = ", ".join(self._ingestion.database.required_tables)
        logger.info("Database ready (%s)", tables)

    def handle_body(self, body: bytes) -> None:
        try:
            raw_dict = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError as exc:
            logger.error("Invalid JSON from broker: %s", exc)
            return

        message_id = str(raw_dict.get("message_id", ""))
        if message_id and self._db.message_exists(message_id):
            logger.debug("Duplicate message_id=%s — skipped", message_id)
            return

        _message, record = self._cleaner.clean_payload(raw_dict)
        self._db.process_message(raw_dict, record)
        logger.info(
            "Processed message_id=%s patient_id=%s data_state=%s",
            record.message_id,
            record.patient_id,
            record.data_state,
        )

    def run_consumer(self) -> None:
        consumer = VitalConsumer(
            rabbitmq_url=load_rabbitmq_url(),
            rabbitmq_settings=self._ingestion.rabbitmq,
            on_message=self.handle_body,
        )
        consumer.run_forever()

    def run_file(self, path: Path) -> int:
        payloads = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(payloads, dict):
            payloads = [payloads]
        for item in payloads:
            self.handle_body(json.dumps(item).encode("utf-8"))
        counts = self._db.count_rows()
        logger.info("Row counts: %s", counts)
        return len(payloads)


def main(argv: list[str] | None = None) -> int:
    load_dotenv(_BACKEND / ".env", override=False)
    ingestion = load_ingestion_settings()
    default_fixture = resolve_backend_path(ingestion.pipeline.default_fixture_path)

    parser = argparse.ArgumentParser(description="Vitals ingestion pipeline")
    parser.add_argument(
        "command",
        nargs="?",
        default="consume",
        choices=("consume", "file", "health"),
    )
    parser.add_argument("--file", type=Path, default=default_fixture)
    args = parser.parse_args(argv)

    pipeline = IngestionPipeline()
    if args.command == "health":
        pipeline.ensure_ready()
        load_rabbitmq_url()
        logger.info("OK — DATABASE_URL, tables, RABBITMQ_URL")
        return 0

    pipeline.ensure_ready()
    if args.command == "consume":
        pipeline.run_consumer()
        return 0
    processed = pipeline.run_file(args.file)
    logger.info("Processed %s fixture message(s)", processed)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
