"""Publish sample vitals to CloudAMQP for local/E2E testing."""

from __future__ import annotations

import argparse
import json
import logging
import math
import sys
import time
import uuid
from dataclasses import replace
from datetime import datetime, timezone
from pathlib import Path

import pika
from dotenv import load_dotenv

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from settings import (
    MockProducerSettings,
    load_ingestion_settings,
    load_rabbitmq_url,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ingestion.mock_producer")


def build_sample_message(sequence: int, mock: MockProducerSettings) -> dict:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    heart_rate = mock.base_heart_rate + (sequence % mock.heart_rate_sequence_mod)
    acc_mag = math.sqrt(
        (mock.default_acc_x ** 2) + (mock.default_acc_y ** 2) + (mock.default_acc_z ** 2)
    )
    gyro_mag = math.sqrt(
        (mock.default_gyro_x ** 2) + (mock.default_gyro_y ** 2) + (mock.default_gyro_z ** 2)
    )
    return {
        "message_id": f"{mock.message_id_prefix}_{sequence:06d}_{uuid.uuid4().hex[:8]}",
        "schema_version": mock.schema_version,
        "patient_id": mock.default_patient_id,
        "device_id": mock.device_id,
        "timestamp": now,
        "signals": {
            "heart_rate": heart_rate,
            "rr_interval_ms": round(60000.0 / heart_rate, 2),
            "hrv_rmssd": mock.default_hrv,
            "systolic_bp": mock.default_systolic_bp,
            "diastolic_bp": mock.default_diastolic_bp,
            "spo2": mock.default_spo2,
            "acc_x": mock.default_acc_x,
            "acc_y": mock.default_acc_y,
            "acc_z": mock.default_acc_z,
            "acc_magnitude": round(acc_mag, 4),
            "gyro_x": mock.default_gyro_x,
            "gyro_y": mock.default_gyro_y,
            "gyro_z": mock.default_gyro_z,
            "gyro_magnitude": round(gyro_mag, 4),
        },
        "context": {
            "activity_state": mock.activity_state,
            "source": mock.context_source,
        },
    }


def publish_messages(
    count: int,
    interval_seconds: float,
    patient_id: str | None,
) -> None:
    load_dotenv(_BACKEND / ".env", override=False)
    ingestion = load_ingestion_settings()
    mock = ingestion.mock_producer
    rmq = ingestion.rabbitmq
    if patient_id:
        mock = replace(mock, default_patient_id=patient_id)

    params = pika.URLParameters(load_rabbitmq_url())
    connection = pika.BlockingConnection(params)
    channel = connection.channel()
    channel.exchange_declare(
        exchange=rmq.exchange_name,
        exchange_type=rmq.exchange_type,
        durable=True,
    )

    for index in range(count):
        payload = build_sample_message(index, mock)
        channel.basic_publish(
            exchange=rmq.exchange_name,
            routing_key=rmq.routing_key,
            body=json.dumps(payload).encode("utf-8"),
            properties=pika.BasicProperties(
                content_type=rmq.message_content_type,
                delivery_mode=rmq.message_delivery_mode,
            ),
        )
        logger.info("Published %s", payload["message_id"])
        if interval_seconds > 0 and index < count - 1:
            time.sleep(interval_seconds)

    connection.close()


def main() -> int:
    load_dotenv(_BACKEND / ".env", override=False)
    mock_defaults = load_ingestion_settings().mock_producer

    parser = argparse.ArgumentParser(description="Publish mock vitals to RabbitMQ")
    parser.add_argument("--count", type=int, default=mock_defaults.default_message_count)
    parser.add_argument(
        "--interval",
        type=float,
        default=mock_defaults.default_interval_seconds,
        help="Seconds between messages",
    )
    parser.add_argument("--patient-id", default=None)
    args = parser.parse_args()
    publish_messages(args.count, args.interval, args.patient_id)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
