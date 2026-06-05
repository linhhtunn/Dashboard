from __future__ import annotations

import argparse
import json
import time
from datetime import datetime, timezone
from typing import Any

from rabbit_mq.rabbitmq import (
    RabbitMQSettings,
    apply_qos,
    connect,
    declare_team1_topology,
    persistent_json_properties,
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def build_alert(feature_message: dict[str, Any], alert_type: str, severity: str, evidence: dict[str, Any]) -> dict[str, Any]:
    return {
        "alert_id": f"alt_{feature_message['feature_id']}_{alert_type}",
        "source_feature_id": feature_message["feature_id"],
        "patient_id": feature_message["patient_id"],
        "timestamp": feature_message["timestamp"],
        "alert_type": alert_type,
        "health_status": "WARNING" if severity in {"LOW", "MEDIUM"} else "ABNORMAL",
        "severity": severity,
        "confidence": 0.75,
        "evidence": evidence,
        "message": f"Mock Team 3 rule triggered: {alert_type}",
        "created_at": utc_now(),
    }


def detect_alert(feature_message: dict[str, Any]) -> dict[str, Any] | None:
    features = feature_message["features"]
    heart_rate = features["heart_rate_current"]
    spo2 = features["spo2_current"]
    systolic_bp = features["systolic_bp_current"]
    acc_magnitude = features["acc_magnitude"]

    if spo2 < 94:
        return build_alert(feature_message, "low_spo2", "HIGH", {"spo2_current": spo2})
    if heart_rate > 175:
        return build_alert(feature_message, "heart_rate_abnormal", "HIGH", {"heart_rate_current": heart_rate})
    if systolic_bp >= 185:
        return build_alert(feature_message, "blood_pressure_abnormal", "MEDIUM", {"systolic_bp_current": systolic_bp})
    if acc_magnitude >= 4:
        return build_alert(feature_message, "possible_fall", "HIGH", {"acc_magnitude": acc_magnitude})

    return None


def alert_cooldown_key(alert: dict[str, Any]) -> tuple[str, str]:
    return alert["patient_id"], alert["alert_type"]


def timestamp_to_epoch_seconds(value: str) -> float:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()


def should_publish_alert(
    alert: dict[str, Any],
    last_alert_at: dict[tuple[str, str], float],
    cooldown_seconds: float,
) -> bool:
    key = alert_cooldown_key(alert)
    alert_time = timestamp_to_epoch_seconds(alert["timestamp"])
    previous = last_alert_at.get(key)
    if previous is not None and alert_time - previous < cooldown_seconds:
        return False
    last_alert_at[key] = alert_time
    return True


def publish_json(channel, queue: dict[str, Any], payload: dict[str, Any], mandatory: bool) -> None:
    channel.basic_publish(
        exchange=queue["exchange"],
        routing_key=queue["routing_key"],
        body=json.dumps(payload, ensure_ascii=True, separators=(",", ":")).encode("utf-8"),
        properties=persistent_json_properties(queue["message_type"]),
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
    print(f"Team3 connection lost ({type(reason).__name__}). Reconnecting...")
    time.sleep(settings.connection_config["retry_delay"])
    return open_worker_channel(settings, no_declare, qos_queue_key)


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Mock Team 3 worker: features -> alerts.created.")
    parser.add_argument("--limit", type=int, default=10, help="Stop after processing this many feature messages.")
    parser.add_argument("--idle-timeout-seconds", type=float, default=5.0, help="Stop after queue is idle this long.")
    parser.add_argument("--no-declare", action="store_true", help="Skip topology declaration and only consume/publish.")
    parser.add_argument("--max-reconnects", type=int, default=10, help="Stop after this many reconnect attempts.")
    parser.add_argument("--alert-cooldown-seconds", type=float, default=60.0, help="Suppress duplicate alert type per patient.")
    return parser


def main() -> None:
    import pika

    args = build_arg_parser().parse_args()
    settings = RabbitMQSettings.from_env()
    connection, channel = open_worker_channel(settings, args.no_declare, "features")

    features_queue = settings.queue("features")
    alerts_queue = settings.queue("alerts")
    consumer_options = settings.consumer_options("features")
    processed = 0
    alert_count = 0
    suppressed_alert_count = 0
    reconnects = 0
    last_alert_at: dict[tuple[str, str], float] = {}
    idle_started_at: float | None = None

    try:
        while processed < args.limit:
            try:
                method_frame, _, body = channel.basic_get(
                    queue=features_queue["name"],
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
                connection, channel = reconnect_worker(settings, args.no_declare, "features", exc)
                continue

            if method_frame is None:
                if idle_started_at is None:
                    idle_started_at = time.monotonic()
                if time.monotonic() - idle_started_at >= args.idle_timeout_seconds:
                    print("No feature messages ready")
                    break
                time.sleep(0.5)
                continue

            idle_started_at = None

            try:
                feature_message = json.loads(body.decode("utf-8"))
                alert = detect_alert(feature_message)
                if alert and should_publish_alert(alert, last_alert_at, args.alert_cooldown_seconds):
                    publish_json(
                        channel,
                        alerts_queue,
                        alert,
                        settings.publisher_config["mandatory"],
                    )
                    alert_count += 1
                    print(f"Team3 alert published from {feature_message['feature_id']}: {alert['alert_type']}")
                elif alert:
                    suppressed_alert_count += 1
                    print(f"Team3 alert suppressed by cooldown from {feature_message['feature_id']}: {alert['alert_type']}")
                else:
                    print(f"Team3 no alert from {feature_message['feature_id']}")

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
                connection, channel = reconnect_worker(settings, args.no_declare, "features", exc)
            except Exception:
                if channel.is_open:
                    channel.basic_nack(delivery_tag=method_frame.delivery_tag, requeue=consumer_options["requeue_on_error"])
                raise
    finally:
        close_connection(connection)

    print(f"Team3 processed feature messages: {processed}")
    print(f"Team3 published alerts: {alert_count}")
    print(f"Team3 suppressed alerts: {suppressed_alert_count}")


if __name__ == "__main__":
    main()
