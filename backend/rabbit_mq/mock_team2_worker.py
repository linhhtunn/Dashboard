from __future__ import annotations

import argparse
import json
import time
from datetime import datetime, timezone
from typing import Any

from backend.rabbit_mq.rabbitmq import (
    RabbitMQSettings,
    apply_qos,
    connect,
    declare_team1_topology,
    persistent_json_properties,
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def build_feature_message(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "feature_id": f"feat_{raw['message_id']}",
        "source_message_id": raw["message_id"],
        "patient_id": raw["patient_id"],
        "timestamp": raw["timestamp"],
        "window": {
            "type": "instant_mock",
            "size_seconds": 1,
        },
        "features": {
            "steps_current": raw["steps"],
            "heart_rate_current": raw["heart_rate"],
            "respiratory_rate_current": raw["respiratory_rate"],
            "stress_score_current": raw["stress_score"],
        },
        "data_state": "VALID",
        "created_at": utc_now(),
    }


def build_fault_message(raw: dict[str, Any], reason: str, field: str | None = None) -> dict[str, Any]:
    return {
        "fault_id": f"fault_{raw.get('message_id', 'unknown')}",
        "source_message_id": raw.get("message_id"),
        "patient_id": raw.get("patient_id"),
        "fault_type": "mock_validation_error",
        "field": field,
        "reason": reason,
        "detected_by": "mock_team2_worker",
        "detected_at": utc_now(),
    }


def parse_int_field(raw: dict[str, Any], field: str) -> tuple[int | None, str | None]:
    try:
        return int(raw[field]), None
    except (TypeError, ValueError):
        return None, f"{field} must be an integer-compatible value"


def validate_wearable_continuous(raw: dict[str, Any]) -> tuple[bool, str | None, str | None]:
    """Mock Team 2 data-quality gate; invalid input is turned into data.fault."""
    required_top_level = {
        "message_id",
        "patient_id",
        "device_id",
        "timestamp",
        "steps",
        "heart_rate",
        "respiratory_rate",
        "stress_score",
    }
    missing = required_top_level - set(raw)
    if missing:
        return False, f"Missing top-level fields: {sorted(missing)}", None

    steps, reason = parse_int_field(raw, "steps")
    if reason:
        return False, reason, "steps"
    heart_rate, reason = parse_int_field(raw, "heart_rate")
    if reason:
        return False, reason, "heart_rate"
    respiratory_rate, reason = parse_int_field(raw, "respiratory_rate")
    if reason:
        return False, reason, "respiratory_rate"
    stress_score, reason = parse_int_field(raw, "stress_score")
    if reason:
        return False, reason, "stress_score"

    if steps < 0:
        return False, "steps must be non-negative", "steps"
    if not 30 <= heart_rate <= 220:
        return False, "heart_rate out of mock valid range 30-220", "heart_rate"
    if not 5 <= respiratory_rate <= 45:
        return False, "respiratory_rate out of mock valid range 5-45", "respiratory_rate"
    if not 0 <= stress_score <= 99:
        return False, "stress_score out of mock valid range 0-99", "stress_score"

    return True, None, None


def publish_json(channel, queue: dict[str, Any], payload: dict[str, Any], mandatory: bool) -> None:
    channel.basic_publish(
        exchange=queue["exchange"],
        routing_key=queue["routing_key"],
        body=json.dumps(payload, ensure_ascii=True, separators=(",", ":")).encode("utf-8"),
        properties=persistent_json_properties(),
        mandatory=mandatory,
    )


def open_worker_channel(settings: RabbitMQSettings, no_declare: bool, qos_queue_key: str):
    connection = connect(settings)
    channel = connection.channel()
    if settings.publisher_config["publisher_confirms"]:
        channel.confirm_delivery()
    if not no_declare:
        declare_team1_topology(channel, settings)
    apply_qos(channel, settings, qos_queue_key)
    return connection, channel


def close_connection(connection) -> None:
    if connection is not None and connection.is_open:
        connection.close()


def reconnect_worker(settings: RabbitMQSettings, no_declare: bool, qos_queue_key: str, reason: Exception):
    print(f"Team2 connection lost ({type(reason).__name__}). Reconnecting...")
    time.sleep(settings.connection_config["retry_delay"])
    return open_worker_channel(settings, no_declare, qos_queue_key)


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Mock Team 2 worker: wearable continuous -> features/data.fault.")
    parser.add_argument("--limit", type=int, default=10, help="Stop after processing this many raw messages.")
    parser.add_argument("--idle-timeout-seconds", type=float, default=5.0, help="Stop after queue is idle this long.")
    parser.add_argument("--no-declare", action="store_true", help="Skip topology declaration and only consume/publish.")
    parser.add_argument("--max-reconnects", type=int, default=10, help="Stop after this many reconnect attempts.")
    return parser


def main() -> None:
    import pika

    args = build_arg_parser().parse_args()
    settings = RabbitMQSettings.from_env()
    connection, channel = open_worker_channel(settings, args.no_declare, "wearable_continuous")

    continuous_queue = settings.queue("wearable_continuous")
    features_queue = settings.queue("features")
    fault_queue = settings.queue("data_fault")
    consumer_options = settings.consumer_options("wearable_continuous")
    processed = 0
    reconnects = 0
    idle_started_at: float | None = None

    try:
        while processed < args.limit:
            try:
                method_frame, _, body = channel.basic_get(
                    queue=continuous_queue["name"],
                    auto_ack=consumer_options["auto_ack"],
                )
            except (
                pika.exceptions.AMQPConnectionError,
                pika.exceptions.AMQPChannelError,
                pika.exceptions.StreamLostError,
                OSError,
            ) as exc:
                reconnects += 1
                if reconnects > args.max_reconnects:
                    raise
                close_connection(connection)
                connection, channel = reconnect_worker(settings, args.no_declare, "wearable_continuous", exc)
                continue

            if method_frame is None:
                if idle_started_at is None:
                    idle_started_at = time.monotonic()
                if time.monotonic() - idle_started_at >= args.idle_timeout_seconds:
                    print("No wearable continuous messages ready")
                    break
                time.sleep(0.5)
                continue

            idle_started_at = None

            try:
                raw = json.loads(body.decode("utf-8"))
                is_valid, reason, field = validate_wearable_continuous(raw)
                if is_valid:
                    publish_json(
                        channel,
                        features_queue,
                        build_feature_message(raw),
                        settings.publisher_config["mandatory"],
                    )
                    print(f"Team2 feature published from {raw['message_id']}")
                else:
                    publish_json(
                        channel,
                        fault_queue,
                        build_fault_message(raw, reason or "unknown validation error", field),
                        settings.publisher_config["mandatory"],
                    )
                    print(f"Team2 data.fault published from {raw.get('message_id')}: {reason}")

                channel.basic_ack(delivery_tag=method_frame.delivery_tag)
                processed += 1
            except (
                pika.exceptions.AMQPConnectionError,
                pika.exceptions.AMQPChannelError,
                pika.exceptions.StreamLostError,
                OSError,
            ) as exc:
                reconnects += 1
                if reconnects > args.max_reconnects:
                    raise
                close_connection(connection)
                connection, channel = reconnect_worker(settings, args.no_declare, "wearable_continuous", exc)
            except Exception:
                if channel.is_open:
                    channel.basic_nack(delivery_tag=method_frame.delivery_tag, requeue=consumer_options["requeue_on_error"])
                raise
    finally:
        close_connection(connection)

    print(f"Team2 processed wearable continuous messages: {processed}")


if __name__ == "__main__":
    main()
